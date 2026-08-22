import React, { useState } from 'react';
import { ProductModel, CompGroup } from '../../types';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Layers,
  Save,
  X,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface ProductMasterTabProps {
  productModels: ProductModel[];
  onSaveProductModel: (model: ProductModel) => Promise<void>;
  onDeleteProductModel: (id: string) => Promise<void>;
}

export const ProductMasterTab: React.FC<ProductMasterTabProps> = ({
  productModels,
  onSaveProductModel,
  onDeleteProductModel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<'ALL' | CompGroup>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const [isBulkActivating, setIsBulkActivating] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<ProductModel> | null>(null);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<ProductModel | null>(null);

  const engineCount = productModels.filter((m) => m.compGroup === 'Engine' || m.category === 'Engine').length;
  const ptPpmCount = productModels.filter((m) => m.compGroup === 'PT-PPM' || (!m.compGroup && m.category !== 'Engine' && !m.modelName?.includes('Cyl'))).length;
  const cylinderCount = productModels.filter((m) => m.compGroup === 'Cylinder' || m.modelName?.includes('Cyl')).length;
  const totalCount = productModels.length;

  const handleBulkActivateChecksheets = async () => {
    setIsBulkActivating(true);
    try {
      const res = await apiClient.ensureStarterChecksheetsForAllActiveProducts();
      setBulkSuccessMsg(
        `Successfully activated ${res.createdCount} starter checksheet templates across all 169 Product Master models!`
      );
      setTimeout(() => setBulkSuccessMsg(null), 6000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkActivating(false);
    }
  };

  const filteredModels = productModels.filter((m) => {
    const group =
      m.compGroup ||
      (m.category === 'Engine' ? 'Engine' : m.modelName?.toLowerCase().includes('cyl') ? 'Cylinder' : 'PT-PPM');

    const matchGroup = groupFilter === 'ALL' || group === groupFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && m.active) ||
      (statusFilter === 'INACTIVE' && !m.active);

    const q = searchQuery.toLowerCase();
    const matchSearch =
      (m.unitModel && m.unitModel.toLowerCase().includes(q)) ||
      (m.component && m.component.toLowerCase().includes(q)) ||
      (m.modelName && m.modelName.toLowerCase().includes(q)) ||
      (m.code && m.code.toLowerCase().includes(q)) ||
      group.toLowerCase().includes(q);

    return matchGroup && matchStatus && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingModel({
      id: `pm-${Date.now()}`,
      compGroup: groupFilter !== 'ALL' ? groupFilter : 'Engine',
      category: groupFilter === 'Engine' ? 'Engine' : 'Power Train Component',
      unitModel: 'HD785-7',
      component: '',
      modelName: '',
      code: '',
      active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (model: ProductModel) => {
    setEditingModel({ ...model });
    setShowModal(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel?.unitModel) return;

    const compGroup: CompGroup =
      editingModel.compGroup ||
      (editingModel.category === 'Engine' ? 'Engine' : 'PT-PPM');

    const componentName = (editingModel.component || editingModel.modelName || '').trim();
    const unitModel = (editingModel.unitModel || '').trim();
    const modelName = componentName || unitModel || 'Standard Component';
    const code = editingModel.code?.trim() || `${unitModel}/${componentName || 'COMP'}`;

    await onSaveProductModel({
      id: editingModel.id || `pm-${Date.now()}`,
      compGroup,
      unitModel,
      component: componentName,
      modelName,
      code,
      category: compGroup === 'Engine' ? 'Engine' : 'Power Train Component',
      active: editingModel.active ?? true,
    });

    setShowModal(false);
    setEditingModel(null);
  };

  const handleToggleActive = async (model: ProductModel) => {
    await onSaveProductModel({ ...model, active: !model.active });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteProductModel(deleteTarget.id);
    setDeleteTarget(null);
  };

  const getCompGroupBadge = (group?: CompGroup | string) => {
    if (group === 'Engine') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (group === 'Cylinder') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-purple-100 text-purple-800 border-purple-200'; // PT-PPM
  };

  return (
    <div className="space-y-4">
      {/* 169 Product Master Compliance & Starter Generator Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/60 rounded-2xl p-4 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-black shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-100">
                169-Model Product Master Database & Starter Checksheets
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalCount >= 169 ? 'Complete (169 Models)' : `${totalCount} Models`}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Active configuration: <strong className="text-blue-300">{engineCount} Engines</strong>,{' '}
              <strong className="text-purple-300">{ptPpmCount} PT-PPM</strong>, and{' '}
              <strong className="text-amber-300">{cylinderCount} Cylinders</strong>. Auto-linked to multi-stage checksheets.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBulkActivateChecksheets}
          disabled={isBulkActivating}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 shrink-0"
        >
          <CheckCheck className="w-4 h-4" />
          <span>{isBulkActivating ? 'Activating...' : 'Bulk Activate Starter Checksheets'}</span>
        </button>
      </div>

      {bulkSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs px-4 py-3 rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bulkSuccessMsg}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Unit Model, Component, Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none font-semibold"
            >
              <option value="ALL">All Component Groups</option>
              <option value="Engine">Engine</option>
              <option value="PT-PPM">PT-PPM (Power Train & Pumps)</option>
              <option value="Cylinder">Cylinder</option>
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
              <span>Add Product Model</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredModels.length}</strong> of {productModels.length} product models
          </span>
          <div className="flex items-center space-x-3">
            <span className="text-blue-700 font-medium">
              Engine: {productModels.filter((m) => m.compGroup === 'Engine' || m.category === 'Engine').length}
            </span>
            <span className="text-purple-700 font-medium">
              PT-PPM: {productModels.filter((m) => m.compGroup === 'PT-PPM' || (!m.compGroup && m.category !== 'Engine' && !m.modelName.includes('Cyl'))).length}
            </span>
            <span className="text-amber-700 font-medium">
              Cylinder: {productModels.filter((m) => m.compGroup === 'Cylinder' || m.modelName.includes('Cyl')).length}
            </span>
          </div>
        </div>
      </div>

      {/* Models Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Comp Group</th>
                <th className="py-2.5 px-3">Unit Model</th>
                <th className="py-2.5 px-3">Component / Model</th>
                <th className="py-2.5 px-3">Standard Code</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No product models found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredModels.map((m) => {
                  const grp =
                    m.compGroup ||
                    (m.category === 'Engine' ? 'Engine' : m.modelName?.toLowerCase().includes('cyl') ? 'Cylinder' : 'PT-PPM');
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCompGroupBadge(
                            grp
                          )}`}
                        >
                          {grp}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {m.unitModel || 'General Unit'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {m.component || m.modelName}
                        </div>
                        {m.compModel && (
                          <div className="text-[10px] text-slate-400">{m.compModel}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {m.code || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(m)}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            m.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {m.active ? (
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
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Model"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Model"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {showModal && editingModel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>{editingModel.component || editingModel.modelName ? 'Edit Product Model' : 'Add New Product Model'}</span>
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
                  Component Group (Comp Group) *
                </label>
                <select
                  value={editingModel.compGroup || 'Engine'}
                  onChange={(e) => {
                    const grp = e.target.value as CompGroup;
                    setEditingModel({
                      ...editingModel,
                      compGroup: grp,
                      category: grp === 'Engine' ? 'Engine' : 'Power Train Component',
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none"
                >
                  <option value="Engine">Engine (Dynotest & GLT)</option>
                  <option value="PT-PPM">PT-PPM (Hydraulic Test & GLT)</option>
                  <option value="Cylinder">Cylinder (Hydraulic Test & GLT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Model *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HD785-7, PC2000-8, D375A-6"
                  value={editingModel.unitModel || ''}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, unitModel: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Component Name / Model *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAA12V140E-3, Main Pump HPV160, Transmission"
                  value={editingModel.component || editingModel.modelName || ''}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      component: e.target.value,
                      modelName: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Model Code / Spec Identifier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. HD785-7/SAA12V140, HPV160-PC2000"
                  value={editingModel.code || ''}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, code: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pm-active"
                  checked={editingModel.active ?? true}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, active: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="pm-active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Active in Work Order / JO intake list
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
                  <span>Save Model</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Delete Product Model?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{deleteTarget.unitModel} - {deleteTarget.component || deleteTarget.modelName}</strong>? Existing historic records will preserve this reference safely.
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
