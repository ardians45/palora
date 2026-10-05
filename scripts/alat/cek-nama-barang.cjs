const fs = require('fs');
const content = fs.readFileSync('backend/seed/products.js', 'utf8');
const items = JSON.parse(content.replace('export const PALETINDO_FULL_STOCK = ', '').replace(/;\s*$/, ''));

console.log('Sample of items without hyphen:');
let count = 0;
for (const p of items) {
  if (!p.name.includes(' - ')) {
    count++;
    if (count <= 35) {
      console.log(`${p.code} -> "${p.name}" | Factory: ${p.factory} | Notes: "${p.notes}"`);
    }
  }
}
console.log('Total without hyphen:', count);
