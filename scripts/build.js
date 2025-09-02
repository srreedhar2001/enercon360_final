const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  const root = __dirname + '/..';
  const dist = path.join(root, 'dist');
  // Clean dist
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist);

  // Build CSS (writes to public/css)
  execSync('node build-css.js', { cwd: root, stdio: 'inherit' });

  // Copy public assets to dist
  copyRecursive(path.join(root, 'public'), path.join(dist, 'public'));

  // Copy invoices if present
  copyRecursive(path.join(root, 'invoices'), path.join(dist, 'invoices'));

  // Copy server files needed to run (minimal)
  const serverFiles = [
  'package.json',
  'index.js',
    'src',
  ];
  for (const f of serverFiles) {
    copyRecursive(path.join(root, f), path.join(dist, f));
  }

  console.log('✅ Build completed. Output in /dist');
}

main();
