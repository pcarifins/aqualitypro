const fs = require('fs');
const acorn = require('acorn');
const acornJsx = require('acorn-jsx');
const Parser = acorn.Parser.extend(acornJsx());

const code = fs.readFileSync('src/components/PriorityQueue.tsx', 'utf-8');
try {
  Parser.parse(code, { sourceType: 'module', ecmaVersion: 'latest' });
  console.log("No syntax errors");
} catch (e) {
  console.log(e.message, e.loc);
}
