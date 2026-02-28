const fs = require('fs');
const code = fs.readFileSync('src/pages/Chat/components/ChatContent/ChatContent.jsx', 'utf8');
const lines = code.split('\n');
let depth = 0;
let inComponent = false;

for (let i = 0; i < Math.min(lines.length, 3370); i++) {
  const line = lines[i];
  if (i >= 206) { // component starts at line 207
    if (!inComponent) {
      inComponent = true;
      depth = 0;
    }
  }
  if (!inComponent) continue;

  // Count braces outside of strings
  let inStr = false;
  let strChar = '';
  let inTemplateLit = false;
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    const prev = j > 0 ? line[j-1] : '';
    if (inStr) {
      if (c === strChar && prev !== '\\') inStr = false;
      continue;
    }
    if (inTemplateLit) {
      if (c === '`' && prev !== '\\') inTemplateLit = false;
      continue;
    }
    if (c === "'" || c === '"') { inStr = true; strChar = c; continue; }
    if (c === '`') { inTemplateLit = true; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
  }
  if (depth <= 0 && i > 210) {
    console.log(`Depth=${depth} at line ${i+1}: ${line.substring(0, 100)}`);
    if (depth < -3) break;
  }
}
console.log('Final depth at line 3367:', depth);
