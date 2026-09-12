const fs = require('fs');
let content = fs.readFileSync('src/components/PriorityQueue.tsx', 'utf-8');

// The instruction is "Delete the following four buttons from the main Action Queue: Move Priority, Audit History, Start, and Resume. Only allow users to initiate the test by directly opening the JO Detail modal."

// In GRID VIEW (around line 595 - 635)
// In LIST VIEW (around line 829 - 881)

content = content.replace(/<div className="flex items-center space-x-0\.5 mr-1">[\s\S]*?<\/div>\s*\}\)\s*<button[\s\S]*?title="Audit History"[\s\S]*?<\/button>\s*\{onStartTest && !isFinish && \([\s\S]*?<\/button>\s*\)\}/g, '');
content = content.replace(/<div className="flex items-center space-x-1 mr-1">[\s\S]*?<\/div>\s*\)\}\s*\{\/\* History Audit Button \*\/\}[\s\S]*?title="View Priority Audit History"[\s\S]*?<\/button>\s*\{onStartTest && !isFinish && \([\s\S]*?<\/button>\s*\)\}/g, '');

fs.writeFileSync('src/components/PriorityQueue.tsx', content);
