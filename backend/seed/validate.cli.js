import { loadSeedFiles } from './loadSeedFiles.js';
import { validateSeed } from './validate.js';

function runCli() {
  try {
    const seed = loadSeedFiles();
    const { errors, warnings } = validateSeed(seed);

    if (warnings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`\nWarnings (${warnings.length}):`);
      for (const warning of warnings) {
        // eslint-disable-next-line no-console
        console.warn(`  [WARN] ${warning}`);
      }
    }

    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`\nErrors (${errors.length}):`);
      for (const error of errors) {
        // eslint-disable-next-line no-console
        console.error(`  [ERROR] ${error}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `\nCounts: ${seed.skills.length} skills, ${seed.relationships.length} relationships, ${seed.careers.length} careers, ${seed.careerSkills.length} career-skills`,
    );
    // eslint-disable-next-line no-console
    console.log(`Validation completed: ${errors.length} errors, ${warnings.length} warnings\n`);

    if (errors.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to run seed validation:', err.message);
    process.exit(1);
  }
}

runCli();
