const fs = require('fs');
let content = fs.readFileSync('src/components/PriorityQueue.tsx', 'utf-8');

content = content.replace(/\{\/\* Up\/Down Reorder Controls \(PPC \/ Supervisor \/ Admin only\) \*\/\}\s*<\/div><\/div>\);\}\)\}/g, '</div></div>);})}');

fs.writeFileSync('src/components/PriorityQueue.tsx', content);
