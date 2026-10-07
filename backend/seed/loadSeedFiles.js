import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads and parses knowledge base seed files from the seed directory.
 *
 * @param {string} [dir] - Optional seed directory path. Defaults to SEED_DIR env
 * or '../shared/seed' relative to current working directory.
 * @returns {{
 *   skills: Array<{ slug: string, name: string, description?: string, category: string, difficulty: number }>,
 *   relationships: Array<{ source: string, target: string, type: string, strength?: number }>,
 *   careers: Array<{ slug: string, name: string, description?: string, category?: string, icon?: string }>,
 *   careerSkills: Array<{ career: string, skill: string, importance: number, requiredLevel: number }>
 * }} Parsed seed collections.
 */
export function loadSeedFiles(dir) {
  let seedDir = dir || process.env.SEED_DIR;
  if (!seedDir) {
    const candidateUp = path.resolve(process.cwd(), '../shared/seed');
    const candidateHere = path.resolve(process.cwd(), 'shared/seed');
    seedDir = fs.existsSync(candidateUp) ? candidateUp : candidateHere;
  }

  const readJson = (filename) => {
    const filePath = path.join(seedDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  };

  const skills = readJson('skills.json');
  const relationships = readJson('relationships.json');
  const careers = readJson('careers.json');
  const careerSkills = readJson('career-skills.json');

  return {
    skills,
    relationships,
    careers,
    careerSkills,
  };
}

export default loadSeedFiles;
