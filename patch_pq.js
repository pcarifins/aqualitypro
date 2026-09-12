const fs = require('fs');
let code = fs.readFileSync('src/components/PriorityQueue.tsx', 'utf-8');

// The instruction is to show one compact control card at the top.
// Let's find the start of the return statement.
const returnStart = code.indexOf('return (');
const preReturn = code.substring(0, returnStart);

// We need to add a function to toggle star priority
const toggleStarFn = `
  const handleToggleStar = async (item: QueueRecord, destinationProcess: string) => {
    if (!canReorder || item.status === 'ON_PROCESS' || item.status === 'FINISH') return;

    if (item.isTopPriority) {
      // Unstar
      try {
        const { store } = await import('../data/storageEngine');
        await store.updateQueueRecord(item.queueRecordId, {
          isTopPriority: false,
          topPriorityRank: null,
          priorityDestination: null,
          prioritySelectedBy: null,
          prioritySelectedAt: null
        });
        await loadQueue();
      } catch (err) {
        console.error(err);
      }
    } else {
      // Star (Max 3 per destination)
      const currentStarred = queueList.filter(q => q.isTopPriority && q.priorityDestination === destinationProcess && q.status === 'WAITING');
      if (currentStarred.length >= 3) {
        alert(\`Maximum of 3 starred JOs allowed for \${destinationProcess}. Please unstar an existing JO first.\`);
        return;
      }
      try {
        const { store } = await import('../data/storageEngine');
        await store.updateQueueRecord(item.queueRecordId, {
          isTopPriority: true,
          topPriorityRank: currentStarred.length + 1,
          priorityDestination: destinationProcess,
          prioritySelectedBy: currentUserName,
          prioritySelectedAt: new Date().toISOString()
        });
        await loadQueue();
      } catch (err) {
        console.error(err);
      }
    }
  };
`;

const newReturn = `return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* COMPACT CONTROL CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search JO, Unit, Model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          {['Engine', 'PT-PPM', 'Cylinder'].map((group) => {
            const isSelected = selectedCompGroup === group;
            return (
              <button
                key={group}
                onClick={() => setSelectedCompGroup(group as CompGroup)}
                className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all \${
                  isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }\`}
              >
                {group}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
          <button
            onClick={handleSyncPPC}
            disabled={isLoading}
            className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
            title="Sync PPC"
          >
            <RefreshCw className={\`w-4 h-4 \${isLoading ? 'animate-spin' : ''}\`} />
          </button>
          {canReorder && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Manual JO</span>
            </button>
          )}
        </div>
      </div>

      {syncFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* SIMPLE LIST/TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 font-black">Priority / JO</th>
                <th className="py-3 px-4 font-black">Unit Model</th>
                <th className="py-3 px-4 font-black">Component</th>
                <th className="py-3 px-4 font-black">Status</th>
                <th className="py-3 px-4 font-black text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scheduledRankedQueue.map((item) => {
                const isOnProcess = item.status === 'ON_PROCESS';
                const isFinish = item.status === 'FINISH';
                
                // Determine destination process for starring
                let destinationProcess = 'Testbench';
                if (item.compGroup === 'Engine') {
                  destinationProcess = item.gltStatus === 'GOOD' || item.testType === 'RETEST' ? 'Dynotest' : 'GLT';
                } else if (item.compGroup === 'PT-PPM') {
                  destinationProcess = item.gltStatus === 'GOOD' || item.testType === 'RETEST' ? 'Testbench' : 'GLT';
                }

                return (
                  <tr key={item.queueRecordId} className={\`hover:bg-slate-50 transition-colors \${isOnProcess ? 'bg-amber-50/30' : isFinish ? 'bg-emerald-50/20' : ''}\`}>
                    <td className="py-3 px-4 whitespace-nowrap flex items-center space-x-3">
                      <button
                        disabled={!canReorder || isOnProcess || isFinish}
                        onClick={() => handleToggleStar(item, destinationProcess)}
                        className={\`p-1.5 rounded-lg transition-all \${
                          item.isTopPriority 
                            ? 'bg-amber-100 text-amber-500 hover:bg-amber-200' 
                            : 'bg-slate-100 text-slate-300 hover:text-amber-400 hover:bg-slate-200'
                        } \${(!canReorder || isOnProcess || isFinish) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}\`}
                        title={item.isTopPriority ? 'Unstar JO' : 'Star as Top 3 Priority'}
                      >
                        <Sparkles className={\`w-4 h-4 \${item.isTopPriority ? 'fill-current' : ''}\`} />
                      </button>
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs inline-block w-fit">
                          {item.joRoNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wide">
                          {destinationProcess}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {item.unitModel || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {item.component || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isOnProcess ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          <span>ON PROCESS</span>
                        </span>
                      ) : isFinish ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md w-max inline-block">
                          FINISH
                        </span>
                      ) : item.gltStatus === 'GOOD' ? (
                        <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md w-max inline-block">
                          GLT READY
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md w-max inline-block">
                          WAITING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      {/* Only direct JO Detail navigation allowed */}
                      <button
                        onClick={() => onOpenJODetail(item.joRoNumber)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {scheduledRankedQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No active JOs match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MANUAL JO MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl border border-slate-200">
            {/* Same Add Modal Content */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add Manual JO / RO</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start space-x-3 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleSaveNewJO} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    JO / RO Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newJoNumber}
                    onChange={(e) => {
                      setNewJoNumber(e.target.value.toUpperCase());
                      setFormError(null);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-mono font-bold"
                    placeholder="e.g. 24101234"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Test Type *
                  </label>
                  <select
                    value={newTestType}
                    onChange={(e) => setNewTestType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="PROD">PROD (Standard)</option>
                    <option value="RETEST">RETEST (Defect Re-verification)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Unit Model *
                  </label>
                  <select
                    required
                    disabled={eligibleProductModels.length === 0}
                    value={newUnitModel}
                    onChange={(e) => {
                      setNewUnitModel(e.target.value);
                      setNewComponent('');
                      setSelectedProductModelId('');
                      setFormError(null);
                    }}
                    className={\`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold bg-white \${
                      eligibleProductModels.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                    }\`}
                  >
                    <option value="">-- Select Unit Model --</option>
                    {availableUnitModels.map((um) => (
                      <option key={um} value={um}>
                        {um}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Component Name *
                  </label>
                  <select
                    required
                    disabled={!newUnitModel || eligibleProductModels.length === 0}
                    value={newComponent}
                    onChange={(e) => {
                      const comp = e.target.value;
                      setNewComponent(comp);
                      setFormError(null);
                      const match = eligibleProductModels.find(
                        (m) =>
                          m.unitModel.trim().toUpperCase() === newUnitModel.trim().toUpperCase() &&
                          (m.component || m.compName || '').trim().toUpperCase() === comp.trim().toUpperCase()
                      );
                      if (match) {
                        setSelectedProductModelId(match.id);
                      }
                    }}
                    className={\`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold bg-white \${
                      !newUnitModel || eligibleProductModels.length === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : ''
                    }\`}
                  >
                    <option value="">
                      {!newUnitModel ? 'Select Unit Model First' : '-- Select Component --'}
                    </option>
                    {availableComponents.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCompGroup === 'PT-PPM' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sub Group (PT vs PPM)
                  </label>
                  <select
                    value={newSubGroup}
                    onChange={(e) => setNewSubGroup(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="">Unspecified</option>
                    <option value="PT">PT (Power Train: Transmission, Torqflow, Motor)</option>
                    <option value="PPM">PPM (Pumps & Valves)</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={eligibleProductModels.length === 0 || isSubmittingJO}
                    className={\`text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1 cursor-pointer \${
                      eligibleProductModels.length === 0 || isSubmittingJO
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }\`}
                  >
                    {isSubmittingJO && <RefreshCw className="w-3 h-3 animate-spin mr-1" />}
                    <span>{isSubmittingJO ? 'Saving...' : 'Save to Queue'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
`;

let result = preReturn + toggleStarFn + newReturn;

// Update calculateScheduleForQueue sorting logic to respect top priority
const rankedQueueRegex = /const rankedQueue = filteredGroupQueue[\s\S]*?\}\);/;
const newRankedQueue = `
  const rankedQueue = filteredGroupQueue
    .filter((q) => !q.isUrgentUnassigned)
    .sort((a, b) => {
      if (a.status === 'ON_PROCESS' && b.status !== 'ON_PROCESS') return -1;
      if (b.status === 'ON_PROCESS' && a.status !== 'ON_PROCESS') return 1;
      if (a.status === 'FINISH' && b.status !== 'FINISH') return 1;
      if (b.status === 'FINISH' && a.status !== 'FINISH') return -1;

      if (a.isTopPriority && !b.isTopPriority) return -1;
      if (!a.isTopPriority && b.isTopPriority) return 1;
      if (a.isTopPriority && b.isTopPriority) {
        return (a.topPriorityRank || 0) - (b.topPriorityRank || 0);
      }

      return a.currentPriority - b.currentPriority;
    });
`;
result = result.replace(rankedQueueRegex, newRankedQueue);

fs.writeFileSync('src/components/PriorityQueue.tsx', result);
