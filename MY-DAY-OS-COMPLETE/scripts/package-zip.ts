import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const zipName = 'MY-DAY-OS-COMPLETE.zip';
const zipPath = path.join(rootDir, zipName);

console.log('Packaging updated project into zip...');

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Use tar with exclude patterns
const cmd = `tar -a -c -f "${zipName}" --exclude=node_modules --exclude=.git --exclude=dist --exclude=_extracted_mark_liv --exclude="*.zip" *`;
execSync(cmd, { stdio: 'inherit' });

console.log('Zip created successfully at:', zipPath);

// Copy to public/ and dist/
const publicDest = path.join(rootDir, 'public', zipName);
const distDest = path.join(rootDir, 'dist', zipName);

fs.copyFileSync(zipPath, publicDest);
console.log('Copied to:', publicDest);

if (fs.existsSync(path.join(rootDir, 'dist'))) {
  fs.copyFileSync(zipPath, distDest);
  console.log('Copied to:', distDest);
}
