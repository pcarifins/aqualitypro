const fs = require('fs');
const content = fs.readFileSync('src/data/productMasterSeed.ts', 'utf-8');
const regex = /compGroup:\s*'([^']+)',.*?unitModel:\s*'([^']+)',\s*component:\s*'([^']+)'/g;
let match;
const products = [];
while ((match = regex.exec(content)) !== null) {
  products.push({compGroup: match[1], unitModel: match[2], component: match[3]});
}
console.log(JSON.stringify(products, null, 2));
