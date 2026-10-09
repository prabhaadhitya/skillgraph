import { User } from '../models/user.model.js';
import { Skill } from '../models/skill.model.js';
import { Career } from '../models/career.model.js';
import { UserSkill } from '../models/userSkill.model.js';
import { AlignmentSnapshot } from '../models/alignmentSnapshot.model.js';
import { getCareerModel } from './careerModel.service.js';
import { computeGapItems } from './engine/gap.js';
import { ApiError } from '../utils/ApiError.js';

// Predefined human-friendly names for categories
const CATEGORY_NAMES = {
  programming: 'Programming',
  'web-development': 'Web Development',
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  'data-analytics': 'Data Analytics',
  'machine-learning': 'Machine Learning',
  'deep-learning': 'Deep Learning',
  'ai-llm': 'AI & LLM',
  cloud: 'Cloud',
  devops: 'DevOps',
  cybersecurity: 'Cybersecurity',
  tools: 'Tools',
  'cs-fundamentals': 'CS Fundamentals',
};

function formatCategoryName(slug) {
  if (!slug) return '';
  return (
    CATEGORY_NAMES[slug] ||
    slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Get student analytics insights (own profile data only).
 * GET /analysis/insights
 *
 * @param {string} userId - Authenticated student ID
 * @returns {Promise<{ data: Object, meta?: Object }>}
 */
export async function getStudentInsights(userId) {
  const [user, userSkills, snapshots] = await Promise.all([
    User.findById(userId).populate('targetCareerId').lean(),
    UserSkill.find({ userId }).populate('skillId').lean(),
    AlignmentSnapshot.find({ userId }).sort({ createdAt: 1 }).lean(),
  ]);

  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  // 1. Category Distribution and student profile built in a single pass over userSkills
  const profile = {};
  const catMap = new Map();
  for (const us of userSkills) {
    const skill = us.skillId;
    const prof = us.proficiency;
    if (skill?.slug && typeof prof === 'number' && prof > 0) {
      profile[skill.slug] = prof;
    }
    if (skill && skill.category && typeof prof === 'number' && prof > 0) {
      const cat = skill.category;
      if (!catMap.has(cat)) {
        catMap.set(cat, { count: 0, sumProf: 0 });
      }
      const entry = catMap.get(cat);
      entry.count += 1;
      entry.sumProf += prof;
    }
  }

  const categoryDistribution = Array.from(catMap.entries())
    .map(([cat, val]) => {
      const avg = Number((val.sumProf / val.count).toFixed(1));
      return {
        category: cat,
        name: formatCategoryName(cat),
        skills: val.count,
        count: val.count,
        avgLevel: avg,
        avgProficiency: avg,
      };
    })
    .sort((a, b) => b.skills - a.skills || a.name.localeCompare(b.name));

  // 2. Alignment History: snapshots over time
  let alignmentHistory = [];
  let meta;

  if (snapshots.length < 2) {
    alignmentHistory = [];
    meta = { empty: true };
  } else {
    alignmentHistory = snapshots.map((s) => ({
      at: s.createdAt.toISOString ? s.createdAt.toISOString() : new Date(s.createdAt).toISOString(),
      date: s.createdAt.toISOString ? s.createdAt.toISOString() : new Date(s.createdAt).toISOString(),
      fitScore: s.fitScore,
      score: s.fitScore,
    }));
  }

  // 3. Top Missing Skills: top 5 skills with gap > 0 from the career engine
  let topMissing = [];
  if (user.targetCareerId?.slug) {
    const { model } = await getCareerModel(user.targetCareerId.slug);
    const gapResult = computeGapItems(model, profile);

    // Items with gap > 0 are already sorted by priority desc, difficulty asc, name asc
    topMissing = gapResult.items
      .filter((it) => it.gap > 0)
      .slice(0, 5)
      .map((it) => ({
        skill: {
          id: it.skill.id || it.skill.slug,
          slug: it.skill.slug,
          name: it.skill.name,
          category: it.skill.category,
        },
        gap: it.gap,
        importance: it.importance,
        priority: it.priority,
      }));
  }

  const data = {
    categoryDistribution,
    skillsByCategory: categoryDistribution,
    alignmentHistory,
    topMissing,
    topMissingSkills: topMissing,
  };

  return { data, meta };
}

/**
 * Admin aggregate overview: total counts and average fit.
 * GET /admin/analytics/overview
 *
 * @returns {Promise<Object>}
 */
export async function getAdminOverview() {
  const [totalStudents, onboardedStudents, totalSkills, totalCareers, avgFitAgg] =
    await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', onboardingCompleted: true }),
      Skill.countDocuments(),
      Career.countDocuments({ isActive: true }),
      AlignmentSnapshot.aggregate([
        { $sort: { userId: 1, createdAt: -1 } },
        {
          $group: {
            _id: '$userId',
            latestFit: { $first: '$fitScore' },
          },
        },
        {
          $group: {
            _id: null,
            avgFit: { $avg: '$latestFit' },
          },
        },
      ]),
    ]);

  const avgFitScore =
    avgFitAgg.length > 0 ? Math.round(avgFitAgg[0].avgFit) : 0;

  return {
    totalStudents,
    onboardedStudents,
    avgFitScore,
    totalSkills,
    totalCareers,
  };
}

/**
 * Admin skill gaps analysis: top skills by % of students with a gap.
 * GET /admin/analytics/skill-gaps?limit=10
 *
 * @param {number} [limit=10]
 * @returns {Promise<{ items: Array<Object> }>}
 */
export async function getAdminSkillGaps(limit = 10) {
  const [students, allSkills, careers] = await Promise.all([
    User.find({
      role: 'student',
      targetCareerId: { $ne: null },
    })
      .select('_id targetCareerId')
      .lean(),
    Skill.find({}).select('_id slug').lean(),
    Career.find({ isActive: true }).select('_id slug').lean(),
  ]);

  if (students.length === 0) {
    return { items: [] };
  }

  const skillSlugById = new Map(allSkills.map((s) => [s._id.toString(), s.slug]));
  const careerSlugById = new Map(careers.map((c) => [c._id.toString(), c.slug]));

  // Load user skill ratings and career models concurrently
  const distinctCareerIds = [...new Set(students.map((s) => s.targetCareerId.toString()))];
  const [userSkills, ...careerModelResults] = await Promise.all([
    UserSkill.find({
      userId: { $in: students.map((s) => s._id) },
    })
      .select('userId skillId proficiency')
      .lean(),
    ...distinctCareerIds.map(async (careerIdStr) => {
      const slug = careerSlugById.get(careerIdStr);
      if (!slug) return null;
      const { model } = await getCareerModel(slug);
      return { careerIdStr, model };
    }),
  ]);

  const modelsByCareerId = new Map();
  for (const res of careerModelResults) {
    if (res) modelsByCareerId.set(res.careerIdStr, res.model);
  }

  const profileByStudent = new Map();
  for (const s of students) {
    profileByStudent.set(s._id.toString(), {});
  }
  for (const us of userSkills) {
    const sId = us.userId.toString();
    const slug = skillSlugById.get(us.skillId.toString());
    if (sId && slug && profileByStudent.has(sId)) {
      profileByStudent.get(sId)[slug] = us.proficiency;
    }
  }

  // Compute gaps per skill using engine gap formula
  const skillStats = new Map();

  for (const student of students) {
    const model = modelsByCareerId.get(student.targetCareerId.toString());
    if (!model) continue;
    const profile = profileByStudent.get(student._id.toString()) || {};

    for (const cs of model.careerSkillsList) {
      const slug = cs.skillSlug;
      const prof = profile[slug] ?? 0;
      const gap = Math.max(0, cs.requiredLevel - prof);

      if (!skillStats.has(slug)) {
        const skillInfo = model.skills.get(slug);
        skillStats.set(slug, {
          skill: {
            id: skillInfo?.id || skillInfo?._id?.toString() || slug,
            slug,
            name: skillInfo?.name || slug,
            category: skillInfo?.category || '',
          },
          studentsConsidered: 0,
          studentsWithGap: 0,
          sumGap: 0,
        });
      }

      const entry = skillStats.get(slug);
      entry.studentsConsidered += 1;
      if (gap > 0) {
        entry.studentsWithGap += 1;
        entry.sumGap += gap;
      }
    }
  }

  const items = Array.from(skillStats.values())
    .map((entry) => {
      const percentWithGap =
        entry.studentsConsidered > 0
          ? Math.round((entry.studentsWithGap / entry.studentsConsidered) * 100)
          : 0;
      const avgGap =
        entry.studentsConsidered > 0
          ? Number((entry.sumGap / entry.studentsConsidered).toFixed(1))
          : 0;
      return {
        skill: entry.skill,
        percentWithGap,
        avgGap,
        studentsConsidered: entry.studentsConsidered,
      };
    })
    .sort(
      (a, b) =>
        b.percentWithGap - a.percentWithGap ||
        b.avgGap - a.avgGap ||
        a.skill.name.localeCompare(b.skill.name),
    )
    .slice(0, limit);

  return { items };
}

/**
 * Admin career distribution: student counts per career.
 * GET /admin/analytics/career-distribution
 *
 * @returns {Promise<{ items: Array<Object> }>}
 */
export async function getAdminCareerDistribution() {
  const [careers, studentCounts] = await Promise.all([
    Career.find({ isActive: true }).lean(),
    User.aggregate([
      { $match: { role: 'student', targetCareerId: { $ne: null } } },
      { $group: { _id: '$targetCareerId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(studentCounts.map((c) => [c._id.toString(), c.count]));
  const totalTargeted = studentCounts.reduce((acc, c) => acc + c.count, 0);

  const items = careers
    .map((c) => {
      const count = countMap.get(c._id.toString()) || 0;
      const percent =
        totalTargeted > 0 ? Math.round((count / totalTargeted) * 100) : 0;
      return {
        career: {
          id: c._id.toString(),
          slug: c.slug,
          name: c.name,
          category: c.category || '',
        },
        students: count,
        percent,
      };
    })
    .sort((a, b) => b.students - a.students || a.career.name.localeCompare(b.career.name));

  return { items };
}

/**
 * Admin skill popularity: skills ranked by student count and average proficiency.
 * GET /admin/analytics/skill-popularity?limit=10
 *
 * @param {number} [limit=10]
 * @returns {Promise<{ items: Array<Object> }>}
 */
export async function getAdminSkillPopularity(limit = 10) {
  const popAgg = await UserSkill.aggregate([
    { $match: { proficiency: { $gt: 0 } } },
    {
      $group: {
        _id: '$skillId',
        students: { $sum: 1 },
        avgProf: { $avg: '$proficiency' },
      },
    },
    { $sort: { students: -1, avgProf: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'skills',
        localField: '_id',
        foreignField: '_id',
        as: 'skill',
      },
    },
    { $unwind: '$skill' },
  ]);

  if (popAgg.length === 0) {
    return { items: [] };
  }

  const items = popAgg.map((p) => ({
    skill: {
      id: p._id.toString(),
      slug: p.skill.slug || '',
      name: p.skill.name || '',
      category: p.skill.category || '',
    },
    students: p.students,
    avgProficiency: Number(p.avgProf.toFixed(1)),
  }));

  return { items };
}

/**
 * Admin semester distribution: count, avg fit score, and avg skills per student by semester.
 * GET /admin/analytics/semester-distribution
 *
 * @returns {Promise<{ items: Array<Object> }>}
 */
export async function getAdminSemesterDistribution() {
  const [students, latestSnapshots, skillCounts] = await Promise.all([
    User.find({ role: 'student' }).select('_id semester').lean(),
    AlignmentSnapshot.aggregate([
      { $sort: { userId: 1, createdAt: -1 } },
      { $group: { _id: '$userId', fitScore: { $first: '$fitScore' } } },
    ]),
    UserSkill.aggregate([
      { $match: { proficiency: { $gt: 0 } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
  ]);

  const studentFitMap = new Map(
    latestSnapshots.map((s) => [s._id.toString(), s.fitScore]),
  );

  const studentSkillCountMap = new Map(
    skillCounts.map((s) => [s._id.toString(), s.count]),
  );

  const semesterMap = new Map();
  for (const s of students) {
    if (typeof s.semester !== 'number') continue;
    const sem = s.semester;
    if (!semesterMap.has(sem)) {
      semesterMap.set(sem, { students: 0, sumFit: 0, sumSkills: 0 });
    }
    const entry = semesterMap.get(sem);
    entry.students += 1;
    entry.sumFit += studentFitMap.get(s._id.toString()) || 0;
    entry.sumSkills += studentSkillCountMap.get(s._id.toString()) || 0;
  }

  const items = Array.from(semesterMap.entries())
    .map(([sem, val]) => ({
      semester: sem,
      students: val.students,
      avgFitScore:
        val.students > 0 ? Math.round(val.sumFit / val.students) : 0,
      avgSkillsPerStudent:
        val.students > 0
          ? Number((val.sumSkills / val.students).toFixed(1))
          : 0,
    }))
    .sort((a, b) => a.semester - b.semester);

  return { items };
}
