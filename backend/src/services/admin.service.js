import { Skill } from '../models/skill.model.js';
import { Career } from '../models/career.model.js';
import { CareerSkill } from '../models/careerSkill.model.js';
import { SkillRelationship } from '../models/skillRelationship.model.js';
import { UserSkill } from '../models/userSkill.model.js';
import { ApiError } from '../utils/ApiError.js';
import { invalidateCareerModels } from './careerModel.service.js';
import { findCycle } from '../../seed/validate.js';

// =============================================================================
// SKILLS
// =============================================================================

export async function createSkill(data) {
  const existing = await Skill.findOne({ slug: data.slug });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', `Skill with slug '${data.slug}' already exists`);
  }

  const skill = await Skill.create(data);
  invalidateCareerModels();
  return { skill };
}

export async function updateSkill(slug, patchData) {
  if (patchData.slug !== undefined && patchData.slug !== slug) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Skill slug is immutable');
  }

  const skill = await Skill.findOne({ slug });
  if (!skill) {
    throw new ApiError(404, 'NOT_FOUND', `Skill '${slug}' not found`);
  }

  if (patchData.name !== undefined) skill.name = patchData.name;
  if (patchData.description !== undefined) skill.description = patchData.description;
  if (patchData.category !== undefined) skill.category = patchData.category;
  if (patchData.difficulty !== undefined) skill.difficulty = patchData.difficulty;

  await skill.save();
  invalidateCareerModels();
  return { skill };
}

export async function deleteSkill(slug) {
  const skill = await Skill.findOne({ slug });
  if (!skill) {
    throw new ApiError(404, 'NOT_FOUND', `Skill '${slug}' not found`);
  }

  const [relCount, careerCount, userCount] = await Promise.all([
    SkillRelationship.countDocuments({
      $or: [{ sourceSkillId: skill._id }, { targetSkillId: skill._id }],
    }),
    CareerSkill.countDocuments({ skillId: skill._id }),
    UserSkill.countDocuments({ skillId: skill._id }),
  ]);

  if (relCount > 0 || careerCount > 0 || userCount > 0) {
    throw new ApiError(
      409,
      'CONFLICT',
      `Cannot delete skill '${slug}': it is referenced by ${relCount} relationship(s), ${careerCount} career(s), and ${userCount} student profile(s)`,
    );
  }

  await Skill.deleteOne({ _id: skill._id });
  invalidateCareerModels();
  return { deleted: true, slug };
}

// =============================================================================
// RELATIONSHIPS
// =============================================================================

export async function getRelationships(skillSlug) {
  const filter = {};

  if (skillSlug) {
    const skill = await Skill.findOne({ slug: skillSlug });
    if (!skill) {
      throw new ApiError(404, 'NOT_FOUND', `Skill '${skillSlug}' not found`);
    }
    filter.$or = [{ sourceSkillId: skill._id }, { targetSkillId: skill._id }];
  }

  const relDocs = await SkillRelationship.find(filter)
    .populate('sourceSkillId')
    .populate('targetSkillId');

  const items = relDocs
    .filter((r) => r.sourceSkillId && r.targetSkillId)
    .map((r) => ({
      id: r._id.toString(),
      source: {
        id: r.sourceSkillId._id.toString(),
        slug: r.sourceSkillId.slug,
        name: r.sourceSkillId.name,
        category: r.sourceSkillId.category,
      },
      target: {
        id: r.targetSkillId._id.toString(),
        slug: r.targetSkillId.slug,
        name: r.targetSkillId.name,
        category: r.targetSkillId.category,
      },
      type: r.relationshipType,
      strength: r.strength,
    }));

  return { items };
}

export async function createRelationship({ source, target, type, strength = 1 }) {
  if (source === target) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Source and target cannot be the same skill');
  }

  const [sourceSkill, targetSkill] = await Promise.all([
    Skill.findOne({ slug: source }),
    Skill.findOne({ slug: target }),
  ]);

  if (!sourceSkill) {
    throw new ApiError(404, 'NOT_FOUND', `Skill '${source}' not found`);
  }
  if (!targetSkill) {
    throw new ApiError(404, 'NOT_FOUND', `Skill '${target}' not found`);
  }

  if (type === 'RELATED_TO') {
    let sourceId = sourceSkill._id;
    let targetId = targetSkill._id;

    if (String(sourceId) > String(targetId)) {
      [sourceId, targetId] = [targetId, sourceId];
    }

    const existing = await SkillRelationship.findOne({
      sourceSkillId: sourceId,
      targetSkillId: targetId,
      relationshipType: 'RELATED_TO',
    });

    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'Relationship already exists');
    }

    const rel = await SkillRelationship.create({
      sourceSkillId: sourceId,
      targetSkillId: targetId,
      relationshipType: 'RELATED_TO',
      strength,
    });

    invalidateCareerModels();
    return { relationship: rel };
  }

  // PREREQUISITE: check duplicate and cycle
  const existing = await SkillRelationship.findOne({
    sourceSkillId: sourceSkill._id,
    targetSkillId: targetSkill._id,
    relationshipType: 'PREREQUISITE',
  });

  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'Relationship already exists');
  }

  // Cycle detection: load all PREREQUISITE relationships
  const prereqDocs = await SkillRelationship.find({
    relationshipType: 'PREREQUISITE',
  }).populate('sourceSkillId targetSkillId');

  const edges = [];
  const skillNameMap = new Map();
  skillNameMap.set(sourceSkill.slug, sourceSkill.name);
  skillNameMap.set(targetSkill.slug, targetSkill.name);

  for (const r of prereqDocs) {
    if (r.sourceSkillId?.slug && r.targetSkillId?.slug) {
      edges.push({
        source: r.sourceSkillId.slug,
        target: r.targetSkillId.slug,
      });
      skillNameMap.set(r.sourceSkillId.slug, r.sourceSkillId.name);
      skillNameMap.set(r.targetSkillId.slug, r.targetSkillId.name);
    }
  }

  // Candidate edge
  edges.push({ source: sourceSkill.slug, target: targetSkill.slug });

  const cycle = findCycle(edges);
  if (cycle) {
    const cycleNames = cycle.map((slug) => skillNameMap.get(slug) || slug);
    throw new ApiError(
      422,
      'RULE_VIOLATION',
      `That would create a loop: ${cycleNames.join(' -> ')}`,
    );
  }

  const rel = await SkillRelationship.create({
    sourceSkillId: sourceSkill._id,
    targetSkillId: targetSkill._id,
    relationshipType: 'PREREQUISITE',
    strength,
  });

  invalidateCareerModels();
  return { relationship: rel };
}

export async function deleteRelationship(id) {
  const rel = await SkillRelationship.findById(id);
  if (!rel) {
    throw new ApiError(404, 'NOT_FOUND', `Relationship '${id}' not found`);
  }

  await SkillRelationship.deleteOne({ _id: id });
  invalidateCareerModels();
  return { deleted: true, id };
}

// =============================================================================
// CAREERS
// =============================================================================

export async function createCareer(data) {
  const existing = await Career.findOne({ slug: data.slug });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', `Career with slug '${data.slug}' already exists`);
  }

  const career = await Career.create(data);
  invalidateCareerModels();
  return { career };
}

export async function updateCareer(slug, patchData) {
  if (patchData.slug !== undefined && patchData.slug !== slug) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Career slug is immutable');
  }

  const career = await Career.findOne({ slug });
  if (!career) {
    throw new ApiError(404, 'NOT_FOUND', `Career '${slug}' not found`);
  }

  if (patchData.name !== undefined) career.name = patchData.name;
  if (patchData.description !== undefined) career.description = patchData.description;
  if (patchData.category !== undefined) career.category = patchData.category;
  if (patchData.icon !== undefined) career.icon = patchData.icon;
  if (patchData.isActive !== undefined) career.isActive = patchData.isActive;

  await career.save();
  invalidateCareerModels(slug);
  invalidateCareerModels();
  return { career };
}

export async function updateCareerSkills(careerSlug, skillsList) {
  const career = await Career.findOne({ slug: careerSlug });
  if (!career) {
    throw new ApiError(404, 'NOT_FOUND', `Career '${careerSlug}' not found`);
  }

  const slugs = [...new Set(skillsList.map((s) => s.skillSlug))];
  const foundSkills = await Skill.find({ slug: { $in: slugs } });
  const skillMap = new Map(foundSkills.map((s) => [s.slug, s]));

  for (const s of skillsList) {
    if (!skillMap.has(s.skillSlug)) {
      throw new ApiError(404, 'NOT_FOUND', `Skill '${s.skillSlug}' not found`);
    }
  }

  // Pre-index prerequisite edges for incoming skills
  const skillIds = Array.from(skillMap.values()).map((s) => s._id);
  const prereqDocs = await SkillRelationship.find({
    relationshipType: 'PREREQUISITE',
    targetSkillId: { $in: skillIds },
  }).populate('sourceSkillId targetSkillId');

  const prereqsByTarget = new Map();
  for (const rel of prereqDocs) {
    if (rel.sourceSkillId?.slug && rel.targetSkillId?.slug) {
      if (!prereqsByTarget.has(rel.targetSkillId.slug)) {
        prereqsByTarget.set(rel.targetSkillId.slug, []);
      }
      prereqsByTarget.get(rel.targetSkillId.slug).push(rel.sourceSkillId.slug);
    }
  }

  const proposedSlugs = new Set(skillsList.map((s) => s.skillSlug));
  const missingDetails = [];

  // V5 Closure check: every direct prerequisite of a career skill must also be in the career
  for (const cs of skillsList) {
    const directPrereqs = prereqsByTarget.get(cs.skillSlug) || [];
    for (const prereq of directPrereqs) {
      if (!proposedSlugs.has(prereq)) {
        missingDetails.push({
          missingSkillSlug: prereq,
          requiredBySkillSlug: cs.skillSlug,
          message: `Skill '${cs.skillSlug}' requires prerequisite '${prereq}'`,
        });
      }
    }
  }

  // V6 Level check: A skill that is a prerequisite of another skill in the career has requiredLevel >= 2
  const levelDetails = [];
  for (const cs of skillsList) {
    let isPrereqOfAnother = false;
    for (const other of skillsList) {
      if (other.skillSlug === cs.skillSlug) continue;
      const otherPrereqs = prereqsByTarget.get(other.skillSlug) || [];
      if (otherPrereqs.includes(cs.skillSlug)) {
        isPrereqOfAnother = true;
        break;
      }
    }

    if (isPrereqOfAnother && cs.requiredLevel < 2) {
      levelDetails.push({
        skillSlug: cs.skillSlug,
        requiredLevel: cs.requiredLevel,
        message: `Skill '${cs.skillSlug}' is a prerequisite for another skill and must have requiredLevel >= 2`,
      });
    }
  }

  if (missingDetails.length > 0 || levelDetails.length > 0) {
    const details = [...missingDetails, ...levelDetails];
    throw new ApiError(
      422,
      'RULE_VIOLATION',
      'Career skills violate prerequisite closure or level rules',
      details,
    );
  }

  // Replace career skills
  await CareerSkill.deleteMany({ careerId: career._id });

  const docsToInsert = skillsList.map((s) => ({
    careerId: career._id,
    skillId: skillMap.get(s.skillSlug)._id,
    importance: s.importance,
    requiredLevel: s.requiredLevel,
  }));

  if (docsToInsert.length > 0) {
    await CareerSkill.insertMany(docsToInsert);
  }

  invalidateCareerModels(career.slug);
  invalidateCareerModels();

  return {
    career,
    skills: skillsList,
  };
}

export default {
  createSkill,
  updateSkill,
  deleteSkill,
  getRelationships,
  createRelationship,
  deleteRelationship,
  createCareer,
  updateCareer,
  updateCareerSkills,
};
