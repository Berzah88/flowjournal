const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const toolsDir = path.join(__dirname, '..', 'tools');
const files = fs.readdirSync(toolsDir);

const results = files.map(f => {
  const fileName = f;
  // search for filename occurrences in repo (excluding the tools file itself)
  try {
    const cmd = `git grep -n "${fileName}" || true`;
    const out = execSync(cmd, { encoding: 'utf8' });
    const lines = out.split('\n').filter(Boolean);
    // count occurrences excluding the match inside tools/<fileName>
    const others = lines.filter(l => !l.startsWith(`tools/${fileName}:`) && !l.includes(`tools\\${fileName}:`));
    return { file: fileName, occurrences: lines.length, referencesOutsideTools: others.length, sample: others.slice(0,5) };
  } catch (e) {
    return { file: fileName, occurrences: 0, referencesOutsideTools: 0, sample: [] };
  }
});

console.log(JSON.stringify(results, null, 2));
