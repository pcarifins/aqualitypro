const fs = require('fs');
let content = fs.readFileSync('src/components/PriorityQueue.tsx', 'utf-8');

// For grid view
let startIdx = content.indexOf('<div className="flex items-center space-x-0.5 mr-1">');
if (startIdx !== -1) {
  let endIdx = content.indexOf('</div>\n                        </td>', startIdx);
  if (endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
  }
}

// For list view
startIdx = content.indexOf('<div className="flex items-center space-x-1 mr-1">');
if (startIdx !== -1) {
  let endIdx = content.indexOf('</div>\n                </div>\n              );', startIdx);
  if (endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
  }
}

fs.writeFileSync('src/components/PriorityQueue.tsx', content);
