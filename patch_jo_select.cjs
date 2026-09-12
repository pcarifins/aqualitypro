const fs = require('fs');

function patchFile(filePath, processName, emptyMsg) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const selectRegex = /<div>\s*<label className="block text-xs font-bold text-slate-700 mb-1\.5">\s*Select .*? JO from Queue <span className="text-rose-500">\*<\/span>\s*<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/g;
  
  const newCards = `<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {queueRecords.map((q) => {
              const isSelected = selectedQueueId === q.queueRecordId;
              return (
                <div
                  key={q.queueRecordId}
                  onClick={() => handleSelectQueueItem(q.queueRecordId)}
                  className={\`p-3 rounded-xl border cursor-pointer transition-all \${
                    isSelected 
                      ? 'bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-400' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }\`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-sm font-black text-slate-800">{q.joRoNumber}</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                      {q.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    <span className="font-bold text-slate-700">{q.unitModel}</span> • {q.component}
                  </div>
                </div>
              );
            })}
          </div>`;
          
  content = content.replace(selectRegex, newCards);
  fs.writeFileSync(filePath, content);
}

patchFile('src/components/DynotestForm.tsx', 'Engine', 'Dynotest');
patchFile('src/components/TestbenchForm.tsx', 'PT-PPM/Cylinder', 'Testbench');

