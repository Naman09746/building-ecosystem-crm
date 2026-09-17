import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const FRONTEND_DIR = path.join(ROOT, 'Frontend');
const APPS_DIR = path.join(ROOT, 'apps');
const PACKAGES_DIR = path.join(ROOT, 'packages');

function runCommand(command) {
  console.log(`Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Failed to execute: ${command}`);
  }
}

// 1. Move UI code to packages/ui
const UI_SRC = path.join(PACKAGES_DIR, 'ui', 'src');
runCommand(`mkdir -p ${UI_SRC}`);
runCommand(`cp -r ${path.join(FRONTEND_DIR, 'src/components/ui')} ${UI_SRC}/components`);
runCommand(`cp -r ${path.join(FRONTEND_DIR, 'src/lib/utils.ts')} ${UI_SRC}/lib/utils.ts || true`);

// 2. Move Core code to packages/core
const CORE_SRC = path.join(PACKAGES_DIR, 'core', 'src');
runCommand(`mkdir -p ${CORE_SRC}`);
runCommand(`cp -r ${path.join(FRONTEND_DIR, 'src/lib')} ${CORE_SRC}/lib`);
runCommand(`cp -r ${path.join(FRONTEND_DIR, 'src/types')} ${CORE_SRC}/types`);
runCommand(`cp -r ${path.join(FRONTEND_DIR, 'src/context')} ${CORE_SRC}/context`);

// 3. Move frontend to apps/real-estate
runCommand(`cp -r ${FRONTEND_DIR} ${path.join(APPS_DIR, 'real-estate')}`);
// 4. Duplicate to apps/materials
runCommand(`cp -r ${FRONTEND_DIR} ${path.join(APPS_DIR, 'materials')}`);

// 5. Replace import paths globally in both apps
function replaceImports(dir) {
  const replaceCmds = [
    // Replace UI imports
    `find ${dir} -type f -name "*.ts*" -exec sed -i '' 's|@/components/ui/|@repo/ui/components/|g' {} +`,
    // Replace lib imports
    `find ${dir} -type f -name "*.ts*" -exec sed -i '' 's|@/lib/|@repo/core/lib/|g' {} +`,
    // Replace types imports
    `find ${dir} -type f -name "*.ts*" -exec sed -i '' 's|@/types/|@repo/core/types/|g' {} +`,
    // Replace context imports
    `find ${dir} -type f -name "*.ts*" -exec sed -i '' 's|@/context/|@repo/core/context/|g' {} +`
  ];
  replaceCmds.forEach(runCommand);
}

replaceImports(path.join(APPS_DIR, 'real-estate'));
replaceImports(path.join(APPS_DIR, 'materials'));

console.log('Migration script complete.');
