const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    const p = path.join(dir, file);
    try {
      const stat = fs.statSync(p);
      if (stat && stat.isDirectory()) {
        // skip node_modules and .git
        if (file === 'node_modules' || file === '.git') return;
        results = results.concat(walk(p));
      } else {
        results.push(p);
      }
    } catch (e) {}
  });
  return results;
}

const repoFiles = walk(process.cwd());
const toolsDir = path.join(process.cwd(), 'tools');
const toolsFiles = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isFile());

const counts = {};
for (const tf of toolsFiles) {
  counts[tf] = 0;
  for (const rf of repoFiles) {
    // skip binary-ish files
    if (rf.includes('node_modules') || rf.includes('.git')) continue;
    try {
      const content = fs.readFileSync(rf, 'utf8');
      if (content.indexOf(tf) !== -1) counts[tf]++;
    } catch (e) {}
  }
}

// print sorted
Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([f,c])=> console.log(`${f}|${c}`));
