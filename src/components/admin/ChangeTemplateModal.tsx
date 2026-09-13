import React, { useState, useMemo } from 'react';
import {
  ChecksheetTemplate,
  TemplateRelationship,
  ProductModel,
  User,
} from '../../types';
import { store } from '../../data/storageEngine';
import { isStarterOrFallbackTemplate, PROTECTED_CONTINGENCY_TEMPLATE_IDS } from '../../services/templateCleanupService';
import {
  FileEdit,
  X,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface ChangeTemplateModalProps {
  relationship: TemplateRelationship;
  templates: ChecksheetTemplate[];
  productModels: ProductModel[];
  allRelationships: TemplateRelationship[];
  currentUser?: User;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ChangeTemplateModal: React.FC<ChangeTemplateModalProps> = ({
  relationship,
  templates,
  productModels,
  allRelationships,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Identify matching product
  const product = useMemo(() => {
    return productModels.find((m) => m.id === relationship.productId) || {
      id: relationship.productId,
      unitModel: relationship.unitModel,
      component: relationship.componentName,
      compGroup: relationship.productGroup || 'PT-PPM',
      active: true,
    };
  }, [productModels, relationship]);

  // Check if duplicate relationships exist for this Product ID
  const duplicateRels = useMemo(() => {
    return allRelationships.filter(
      (r) => r.productId === relationship.productId && r.status === 'ACTIVE'
    );
  }, [allRelationships, relationship.productId]);

  const isDuplicate = duplicateRels.length > 1;

  // Filter valid candidate templates:
  // Rules:
  // - Show ACTIVE or DRAFT templates (DRAFT will be automatically activated on assignment)
  // - Exclude ARCHIVED templates
  // - Match the correct testing stage and component group
  // - Hide fallback templates (tmpl-performance-only-fallback-v1, etc.)
  // - Hide starter / corrupted templates
  const eligibleTemplates = useMemo(() => {
    const isEngine = product.compGroup === 'Engine' || relationship.finalProcess?.toUpperCase() === 'DYNOTEST';

    return templates.filter((t) => {
      if (t.status === 'ARCHIVED') return false;
      if (PROTECTED_CONTINGENCY_TEMPLATE_IDS.has(t.id)) return false;
      if (isStarterOrFallbackTemplate(t.id, t.name)) return false;
      if (t.id === 'tmpl-torque-converter-performance-v1') return false;

      if (isEngine) {
        return t.compGroup === 'Engine' || t.testStage === 'Dynotest';
      } else {
        return t.compGroup !== 'Engine' && t.testStage !== 'Dynotest';
      }
    });
  }, [templates, product, relationship]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      setErrorMessage('Please select a replacement checksheet template.');
      return;
    }
    if (!changeReason.trim()) {
      setErrorMessage('Change reason is required to maintain audit compliance.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const adminName = currentUser?.name || currentUser?.username || 'Admin QC';
      const result = await store.changeRelationshipTemplate({
        productId: relationship.productId,
        newTemplateId: selectedTemplateId,
        changeReason: changeReason.trim(),
        actorName: adminName,
      });

      if (result.success) {
        onSuccess(
          `Successfully updated template mapping for ${relationship.unitModel} - ${relationship.componentName}.`
        );
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to change checksheet template relationship.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Change Checksheet Template</h3>
              <p className="text-xs text-slate-500">
                Update product-to-checksheet relationship mapping with full audit traceability
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Relationship Alert */}
        {isDuplicate && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900">
              <div className="font-bold uppercase tracking-wide text-[11px] text-rose-700">
                DUPLICATE RELATIONSHIP DETECTED ({duplicateRels.length} Active Mappings)
              </div>
              <p className="mt-1">
                More than one active relationship exists for Product ID <span className="font-mono font-bold">{relationship.productId}</span>. 
                Selecting and saving a replacement template below will atomically deactivate all duplicate mappings and establish exactly one authoritative relationship.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Product & Current Mapping Info Grid */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Target Product Information</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Product ID</span>
                <span className="font-mono font-bold text-slate-900">{relationship.productId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Component Group</span>
                <span className="font-semibold text-slate-800">{product.compGroup || relationship.productGroup}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Unit Model</span>
                <span className="font-semibold text-slate-800">{relationship.unitModel}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Component Name</span>
                <span className="font-semibold text-slate-800">{relationship.componentName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Testing Stage</span>
                <span className="font-bold text-blue-700">{relationship.finalProcess}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Status</span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                  relationship.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {relationship.status}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 mt-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Assigned Template</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {relationship.templateId}
                </span>
                <span className="font-medium text-slate-700">({relationship.templateName})</span>
              </div>
            </div>
          </div>

          {/* Replacement Template Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Select Replacement Shared Template <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
              required
            >
              <option value="">-- Select an Approved Shared Production Template --</option>
              {eligibleTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} [{t.id}] - {t.compGroup} ({t.testStage}) {t.status === 'DRAFT' ? '• [DRAFT - will activate]' : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500">
              Showing {eligibleTemplates.length} approved active shared templates compatible with {product.compGroup} / {relationship.finalProcess}.
            </p>
          </div>

          {/* Change Reason Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Reason for Template Change <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Migrated from legacy checksheet to approved universal shared template; standardizing 1:1 mapping."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-400"
              required
            />
            <p className="text-[10px] text-slate-400">
              This reason will be logged in the immutable Audit Trail with your Admin credentials.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedTemplateId || !changeReason.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Apply & Activate Template'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
