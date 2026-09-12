const fs = require('fs');
let content = fs.readFileSync('src/components/PriorityQueue.tsx', 'utf-8');

content = content.replace(/\{canReorder && !item\.priorityLocked && !isOnProcess && !isFinish && \(\s*<\/div>\s*<\/div>\s*\);\s*\}\)\}/g, '</div></div>);})}');

fs.writeFileSync('src/components/PriorityQueue.tsx', content);
