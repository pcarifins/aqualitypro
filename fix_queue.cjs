const fs = require('fs');
let content = fs.readFileSync('src/components/PriorityQueue.tsx', 'utf-8');

content = content.replace(/<div className="flex items-center justify-end space-x-1\.5">[\s\S]*?<\/tr>/g, '<div className="flex items-center justify-end space-x-1.5"></div></td></tr>');

fs.writeFileSync('src/components/PriorityQueue.tsx', content);
