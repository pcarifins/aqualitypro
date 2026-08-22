import React, { useState } from 'react';
import { Assembler } from '../../types';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Wrench,
  ShieldAlert,
  Save,
  X,
  Building2,
  BadgeInfo,
} from 'lucide-react';

interface AssemblerMasterTabProps {
  assemblers: Assembler[];
  onSaveAssembler: (assembler: Assembler) => Promise<void>;
  onDeleteAssembler: (id: string) => Promise<void>;
}

const SECTIONS = [
  'ENGINE ASSY',
  'TRANSMISSION',
  'TORQUE CONVERTER',
  'MAIN PUMP',
  'HYDRAULIC MOTOR',
  'CONTROL VALVE',
  'CYLINDER',
  'FINAL DRIVE',
  'GENERAL ASSY',
];

export const AssemblerMasterTab: React.FC<AssemblerMasterTabProps> = ({
  assemblers,
  onSaveAssembler,
  onDeleteAssembler,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAssembler, setEditingAssembler] = useState<Partial<Assembler> | null>(null);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<Assembler | null>(null);

  const filteredAssemblers = assemblers.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.section.toLowerCase().includes(searchQuery.toLowerCase());

    const matchSection = sectionFilter === 'ALL' || a.section === sectionFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && a.active) ||
      (statusFilter === 'INACTIVE' && !a.active);

    return matchSearch && matchSection && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingAssembler({
      id: `asm-${Date.now()}`,
      name: '',
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      section: 'ENGINE ASSY',
      active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (assembler: Assembler) => {
    setEditingAssembler({ ...assembler });
    setShowModal(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssembler?.name || !editingAssembler.employeeId || !editingAssembler.section) {
      return;
    }

    await onSaveAssembler({
      id: editingAssembler.id || `asm-${Date.now()}`,
      name: editingAssembler.name.trim(),
      employeeId: editingAssembler.employeeId.trim(),
      section: editingAssembler.section.trim(),
      active: editingAssembler.active ?? true,
    });

    setShowModal(false);
    setEditingAssembler(null);
  };

  const handleToggleActive = async (assembler: Assembler) => {
    await onSaveAssembler({ ...assembler, active: !assembler.active });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteAssembler(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Banner / Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start space-x-3 text-blue-900">
        <BadgeInfo className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold">Assembly Mechanic Master (Non-Login Entity):</span>
          <p className="text-blue-700 mt-0.5 leading-relaxed">
            Assemblers represent physical shop floor mechanics assigned to engine/component assembly. They are NOT login accounts and do not hold system credentials.
          </p>
        </div>
      </div>

      {/* Control Bar: Search & Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, employee ID, section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Sections ({SECTIONS.length})</option>
              {SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Assembler</span>
            </button>
          </div>
        </div>

        {/* Total Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredAssemblers.length}</strong> of {assemblers.length} assemblers
          </span>
          <span className="flex items-center space-x-2">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Active: {assemblers.filter((a) => a.active).length}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
              <span>Inactive: {assemblers.filter((a) => !a.active).length}</span>
            </span>
          </span>
        </div>
      </div>

      {/* Assembler List / Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Assembler Name</th>
                <th className="py-2.5 px-3">Employee ID</th>
                <th className="py-2.5 px-3">Assembly Section</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssemblers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No assemblers found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredAssemblers.map((asm) => (
                  <tr key={asm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                        {asm.name.charAt(0)}
                      </div>
                      <div>
                        <div>{asm.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">Physical Mechanic</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">
                      {asm.employeeId}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        <Wrench className="w-3 h-3 text-slate-500" />
                        <span>{asm.section}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(asm)}
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          asm.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {asm.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(asm)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Assembler"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(asm)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Assembler"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {showModal && editingAssembler && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{editingAssembler.name ? 'Edit Assembler' : 'Add New Assembler'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mechanic Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe, Bambang S."
                  value={editingAssembler.name || ''}
                  onChange={(e) =>
                    setEditingAssembler({ ...editingAssembler, name: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee ID (NIK) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-1044, NIK-8821"
                  value={editingAssembler.employeeId || ''}
                  onChange={(e) =>
                    setEditingAssembler({ ...editingAssembler, employeeId: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assembly Section *
                </label>
                <select
                  value={editingAssembler.section || 'ENGINE ASSY'}
                  onChange={(e) =>
                    setEditingAssembler({ ...editingAssembler, section: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="asm-active"
                  checked={editingAssembler.active ?? true}
                  onChange={(e) =>
                    setEditingAssembler({ ...editingAssembler, active: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="asm-active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Active (Available in GLT / Test Bench selection)
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Assembler</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Delete Assembler Record?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete assembler <strong className="text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.employeeId})? Existing historic test records will preserve their historical mechanic name.
            </p>
            <div className="flex space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
