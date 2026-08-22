import React, { useState, useEffect } from 'react';
import {
  ChecksheetTemplate,
  ChecksheetSection,
  ChecksheetTemplateItem,
  CompGroup,
  TestProcess,
  TrialInputType,
  NumericValidationType,
} from '../../types';
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Copy,
  GitBranch,
  CheckCheck,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Save,
  X,
  AlertCircle,
  Sliders,
  HelpCircle,
  Eye,
  ShieldCheck,
} from 'lucide-react';

interface ChecksheetMasterTabProps {
  templates: ChecksheetTemplate[];
  onSaveTemplate: (template: ChecksheetTemplate) => Promise<void>;
  onActivateTemplate: (templateId: string) => Promise<void>;
  onCreateRevision: (templateId: string) => Promise<ChecksheetTemplate | null>;
  onDuplicateTemplate: (templateId: string) => Promise<ChecksheetTemplate | null>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
}

export const ChecksheetMasterTab: React.FC<ChecksheetMasterTabProps> = ({
  templates,
  onSaveTemplate,
  onActivateTemplate,
  onCreateRevision,
  onDuplicateTemplate,
  onDeleteTemplate,
}) => {
  const [selectedCompGroup, setSelectedCompGroup] = useState<'ALL' | CompGroup>('ALL');
  const [selectedStage, setSelectedStage] = useState<'ALL' | TestProcess>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Template for Inspection / Deep Editor
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates.find((t) => t.status === 'ACTIVE')?.id || templates[0]?.id || null
  );

  // Template Form Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateMeta, setEditingTemplateMeta] = useState<Partial<ChecksheetTemplate> | null>(null);

  // Full Editor Active Template
  const [workingTemplate, setWorkingTemplate] = useState<ChecksheetTemplate | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Section Modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<{ id?: string; name: string } | null>(null);

  // Item Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemSectionId, setEditingItemSectionId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<ChecksheetTemplateItem> | null>(null);

  // Sync selected template into working state
  useEffect(() => {
    if (selectedTemplateId) {
      const found = templates.find((t) => t.id === selectedTemplateId);
      if (found) {
        setWorkingTemplate(JSON.parse(JSON.stringify(found)));
        setHasUnsavedChanges(false);
      }
    } else if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [selectedTemplateId, templates]);

  const filteredTemplates = templates.filter((t) => {
    const matchGroup = selectedCompGroup === 'ALL' || t.compGroup === selectedCompGroup;
    const matchStage = selectedStage === 'ALL' || t.testStage === selectedStage;
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      t.name.toLowerCase().includes(q) ||
      t.component.toLowerCase().includes(q) ||
      t.unitModel.toLowerCase().includes(q);

    return matchGroup && matchStage && matchStatus && matchSearch;
  });

  const getStatusBadge = (status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED') => {
    if (status === 'ACTIVE') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (status === 'DRAFT') {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    return 'bg-slate-100 text-slate-600 border-slate-300';
  };

  // --- TEMPLATE ACTIONS ---
  const handleOpenCreateTemplate = () => {
    setEditingTemplateMeta({
      id: `tmpl-${Date.now()}`,
      name: '',
      compGroup: selectedCompGroup !== 'ALL' ? selectedCompGroup : 'Engine',
      unitModel: 'ALL',
      component: '',
      testStage: selectedStage !== 'ALL' ? selectedStage : 'GLT',
      revision: 1,
      status: 'DRAFT',
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          name: 'General Inspection',
          displayOrder: 1,
          items: [],
        },
      ],
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplateMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateMeta?.name || !editingTemplateMeta.component) return;

    const newTmpl: ChecksheetTemplate = {
      id: editingTemplateMeta.id || `tmpl-${Date.now()}`,
      name: editingTemplateMeta.name.trim(),
      compGroup: editingTemplateMeta.compGroup || 'Engine',
      unitModel: editingTemplateMeta.unitModel || 'ALL',
      component: editingTemplateMeta.component.trim(),
      testStage: editingTemplateMeta.testStage || 'GLT',
      revision: editingTemplateMeta.revision || 1,
      status: editingTemplateMeta.status || 'DRAFT',
      sections: editingTemplateMeta.sections || [
        {
          id: `sec-${Date.now()}-1`,
          name: 'General Inspection',
          displayOrder: 1,
          items: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveTemplate(newTmpl);
    setShowTemplateModal(false);
    setSelectedTemplateId(newTmpl.id);
  };

  const handleSaveWorkingTemplate = async () => {
    if (!workingTemplate) return;
    await onSaveTemplate(workingTemplate);
    setHasUnsavedChanges(false);
  };

  const handleActivateCurrent = async (tmplId: string) => {
    await onActivateTemplate(tmplId);
  };

  const handleCreateRev = async (tmplId: string) => {
    const rev = await onCreateRevision(tmplId);
    if (rev) {
      setSelectedTemplateId(rev.id);
    }
  };

  const handleDuplicate = async (tmplId: string) => {
    const dup = await onDuplicateTemplate(tmplId);
    if (dup) {
      setSelectedTemplateId(dup.id);
    }
  };

  const handleDelete = async (tmplId: string) => {
    if (confirm('Are you sure you want to delete this checksheet template?')) {
      await onDeleteTemplate(tmplId);
      const remaining = templates.filter((t) => t.id !== tmplId);
      if (remaining.length > 0) {
        setSelectedTemplateId(remaining[0].id);
      } else {
        setSelectedTemplateId(null);
      }
    }
  };

  // --- SECTION ACTIONS ---
  const handleOpenAddSection = () => {
    setEditingSection({ name: '' });
    setShowSectionModal(true);
  };

  const handleOpenEditSection = (section: ChecksheetSection) => {
    setEditingSection({ id: section.id, name: section.name });
    setShowSectionModal(true);
  };

  const handleSaveSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workingTemplate || !editingSection?.name) return;

    const sections = [...workingTemplate.sections];
    if (editingSection.id) {
      const idx = sections.findIndex((s) => s.id === editingSection.id);
      if (idx >= 0) {
        sections[idx].name = editingSection.name.trim();
      }
    } else {
      sections.push({
        id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: editingSection.name.trim(),
        displayOrder: sections.length + 1,
        items: [],
      });
    }

    setWorkingTemplate({ ...workingTemplate, sections });
    setHasUnsavedChanges(true);
    setShowSectionModal(false);
    setEditingSection(null);
  };

  const handleDeleteSection = (secId: string) => {
    if (!workingTemplate) return;
    if (confirm('Delete this entire section and all its checksheet items?')) {
      const sections = workingTemplate.sections.filter((s) => s.id !== secId);
      setWorkingTemplate({ ...workingTemplate, sections });
      setHasUnsavedChanges(true);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!workingTemplate) return;
    const sections = [...workingTemplate.sections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;

    // re-assign display orders
    sections.forEach((s, idx) => {
      s.displayOrder = idx + 1;
    });

    setWorkingTemplate({ ...workingTemplate, sections });
    setHasUnsavedChanges(true);
  };

  // --- ITEM ACTIONS ---
  const handleOpenAddItem = (sectionId: string) => {
    setEditingItemSectionId(sectionId);
    setEditingItem({
      id: `itm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemName: '',
      inputType: 'GOOD / NOT GOOD',
      unit: '',
      validation: 'NONE',
      minimumValue: undefined,
      maximumValue: undefined,
      targetValue: undefined,
      toleranceValue: undefined,
      displayOrder: 1,
      mandatory: true,
      active: true,
    });
    setShowItemModal(true);
  };

  const handleOpenEditItem = (sectionId: string, item: ChecksheetTemplateItem) => {
    setEditingItemSectionId(sectionId);
    setEditingItem({ ...item });
    setShowItemModal(true);
  };

  const handleSaveItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workingTemplate || !editingItemSectionId || !editingItem?.itemName) return;

    const sections = [...workingTemplate.sections];
    const secIdx = sections.findIndex((s) => s.id === editingItemSectionId);
    if (secIdx < 0) return;

    const items = [...sections[secIdx].items];
    const existingIdx = items.findIndex((i) => i.id === editingItem.id);

    const savedItem: ChecksheetTemplateItem = {
      id: editingItem.id || `itm-${Date.now()}`,
      itemName: editingItem.itemName.trim(),
      inputType: editingItem.inputType || 'GOOD / NOT GOOD',
      unit: editingItem.unit?.trim() || '',
      validation: editingItem.validation || 'NONE',
      minimumValue: editingItem.minimumValue !== undefined ? Number(editingItem.minimumValue) : undefined,
      maximumValue: editingItem.maximumValue !== undefined ? Number(editingItem.maximumValue) : undefined,
      targetValue: editingItem.targetValue !== undefined ? Number(editingItem.targetValue) : undefined,
      toleranceValue: editingItem.toleranceValue !== undefined ? Number(editingItem.toleranceValue) : undefined,
      displayOrder: editingItem.displayOrder || items.length + 1,
      mandatory: editingItem.mandatory ?? true,
      active: editingItem.active ?? true,
    };

    if (existingIdx >= 0) {
      items[existingIdx] = savedItem;
    } else {
      savedItem.displayOrder = items.length + 1;
      items.push(savedItem);
    }

    sections[secIdx].items = items;
    setWorkingTemplate({ ...workingTemplate, sections });
    setHasUnsavedChanges(true);
    setShowItemModal(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    if (!workingTemplate) return;
    const sections = [...workingTemplate.sections];
    const secIdx = sections.findIndex((s) => s.id === sectionId);
    if (secIdx >= 0) {
      sections[secIdx].items = sections[secIdx].items.filter((i) => i.id !== itemId);
      setWorkingTemplate({ ...workingTemplate, sections });
      setHasUnsavedChanges(true);
    }
  };

  const handleToggleItemActive = (sectionId: string, itemId: string) => {
    if (!workingTemplate) return;
    const sections = [...workingTemplate.sections];
    const secIdx = sections.findIndex((s) => s.id === sectionId);
    if (secIdx >= 0) {
      const item = sections[secIdx].items.find((i) => i.id === itemId);
      if (item) {
        item.active = !item.active;
        setWorkingTemplate({ ...workingTemplate, sections });
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleMoveItem = (sectionId: string, index: number, direction: 'up' | 'down') => {
    if (!workingTemplate) return;
    const sections = [...workingTemplate.sections];
    const secIdx = sections.findIndex((s) => s.id === sectionId);
    if (secIdx < 0) return;

    const items = [...sections[secIdx].items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    items.forEach((it, idx) => {
      it.displayOrder = idx + 1;
    });

    sections[secIdx].items = items;
    setWorkingTemplate({ ...workingTemplate, sections });
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-4">
      {/* Template Browser & Editor Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Template Selector & Hierarchy Filter (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Templates Directory</span>
              </h3>
              <button
                type="button"
                onClick={handleOpenCreateTemplate}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Filters */}
            <div className="space-y-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={selectedCompGroup}
                  onChange={(e) => setSelectedCompGroup(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Groups</option>
                  <option value="Engine">Engine</option>
                  <option value="PT-PPM">PT-PPM</option>
                  <option value="Cylinder">Cylinder</option>
                </select>

                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Stages</option>
                  <option value="GLT">GLT</option>
                  <option value="Dynotest">Dynotest</option>
                  <option value="Hydraulic Test">Hydraulic Test</option>
                </select>
              </div>

              <div className="flex gap-1">
                {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                      statusFilter === st
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Template List */}
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No templates found.
                </div>
              ) : (
                filteredTemplates.map((t) => {
                  const isSelected = selectedTemplateId === t.id;
                  const totalItems = t.sections.reduce((acc, s) => acc + s.items.length, 0);

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 leading-tight">
                          {t.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wide border ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700">{t.compGroup}</span>
                        <span>•</span>
                        <span>{t.testStage}</span>
                        <span>•</span>
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                          Rev {t.revision}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          Unit: <strong className="text-slate-600">{t.unitModel}</strong>
                        </span>
                        <span>
                          {t.sections.length} Sec / {totalItems} Items
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Section & Item Builder (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {workingTemplate ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
              {/* Top Banner with Active Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-black text-slate-900">
                      {workingTemplate.name}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadge(
                        workingTemplate.status
                      )}`}
                    >
                      {workingTemplate.status} • Rev {workingTemplate.revision}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {workingTemplate.compGroup} • {workingTemplate.testStage} Stage • Component: <strong className="text-slate-700">{workingTemplate.component}</strong> (Unit: {workingTemplate.unitModel})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {hasUnsavedChanges && (
                    <button
                      type="button"
                      onClick={handleSaveWorkingTemplate}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1 animate-pulse"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  )}

                  {workingTemplate.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => handleActivateCurrent(workingTemplate.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1"
                      title="Promote to ACTIVE template"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Set as Active</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCreateRev(workingTemplate.id)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    title="Create Draft Revision (Rev +1)"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                    <span>New Revision</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(workingTemplate.id)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    title="Duplicate Template"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(workingTemplate.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sections & Items Area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Checksheet Inspection Sections ({workingTemplate.sections.length})
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddSection}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>

                {workingTemplate.sections.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 text-xs">
                    No sections in this template yet. Click &quot;Add Section&quot; to begin building checksheet items.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {workingTemplate.sections.map((sec, secIdx) => (
                      <div
                        key={sec.id}
                        className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3"
                      >
                        {/* Section Header */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center justify-center">
                              {secIdx + 1}
                            </span>
                            <h4 className="font-bold text-xs text-slate-900">
                              {sec.name}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              ({sec.items.length} items)
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              disabled={secIdx === 0}
                              onClick={() => handleMoveSection(secIdx, 'up')}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Move section up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={secIdx === workingTemplate.sections.length - 1}
                              onClick={() => handleMoveSection(secIdx, 'down')}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Move section down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSection(sec)}
                              className="p-1 text-slate-500 hover:text-blue-600"
                              title="Rename section"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Delete section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAddItem(sec.id)}
                              className="ml-1 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-bold flex items-center space-x-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Item</span>
                            </button>
                          </div>
                        </div>

                        {/* Items List */}
                        {sec.items.length === 0 ? (
                          <div className="text-center py-3 text-slate-400 text-[11px] italic">
                            No items in this section. Click &quot;Add Item&quot; to add checks.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {sec.items.map((item, itmIdx) => (
                              <div
                                key={item.id}
                                className={`bg-white border rounded-lg p-2.5 flex items-center justify-between transition-colors ${
                                  item.active
                                    ? 'border-slate-200 hover:border-slate-300'
                                    : 'border-slate-200 bg-slate-100/60 opacity-60'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                                  <span className="text-[10px] font-mono font-bold text-slate-400 w-4 shrink-0">
                                    #{itmIdx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-xs text-slate-800 truncate">
                                        {item.itemName}
                                      </span>
                                      {item.mandatory && (
                                        <span className="text-rose-500 text-[10px] font-bold" title="Mandatory">*</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-0.5">
                                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                                        {item.inputType}
                                      </span>
                                      {item.unit && (
                                        <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-mono border border-blue-200">
                                          Unit: {item.unit}
                                        </span>
                                      )}
                                      {item.inputType === 'Numeric' && (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-medium border border-amber-200">
                                          {item.validation === 'RANGE'
                                            ? `Range: ${item.minimumValue} ~ ${item.maximumValue}`
                                            : item.validation === 'MINIMUM'
                                            ? `Min: ≥ ${item.minimumValue}`
                                            : item.validation === 'MAXIMUM'
                                            ? `Max: ≤ ${item.maximumValue}`
                                            : item.validation === 'TARGET_TOLERANCE'
                                            ? `Target: ${item.targetValue} ± ${item.toleranceValue}`
                                            : 'No Standard (Record Value Only)'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleItemActive(sec.id, item.id)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                      item.active
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-100 text-slate-400 border-slate-200'
                                    }`}
                                  >
                                    {item.active ? 'Active' : 'Off'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={itmIdx === 0}
                                    onClick={() => handleMoveItem(sec.id, itmIdx, 'up')}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={itmIdx === sec.items.length - 1}
                                    onClick={() => handleMoveItem(sec.id, itmIdx, 'down')}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditItem(sec.id, item)}
                                    className="p-1 text-slate-500 hover:text-blue-600"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(sec.id, item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
              Select or create a checksheet template from the left directory to view its structure.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create / Edit Template Metadata */}
      {showTemplateModal && editingTemplateMeta && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Create New Checksheet Template</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateMetaSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAA12V140E-3 GLT Master Checksheet"
                  value={editingTemplateMeta.name || ''}
                  onChange={(e) =>
                    setEditingTemplateMeta({ ...editingTemplateMeta, name: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Comp Group *
                  </label>
                  <select
                    value={editingTemplateMeta.compGroup || 'Engine'}
                    onChange={(e) =>
                      setEditingTemplateMeta({
                        ...editingTemplateMeta,
                        compGroup: e.target.value as CompGroup,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-bold focus:outline-none"
                  >
                    <option value="Engine">Engine</option>
                    <option value="PT-PPM">PT-PPM</option>
                    <option value="Cylinder">Cylinder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Test Stage *
                  </label>
                  <select
                    value={editingTemplateMeta.testStage || 'GLT'}
                    onChange={(e) =>
                      setEditingTemplateMeta({
                        ...editingTemplateMeta,
                        testStage: e.target.value as TestProcess,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-bold focus:outline-none"
                  >
                    <option value="GLT">GLT</option>
                    <option value="Dynotest">Dynotest</option>
                    <option value="Hydraulic Test">Hydraulic Test</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Component Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SAA12V140E-3, Main Pump HPV160"
                    value={editingTemplateMeta.component || ''}
                    onChange={(e) =>
                      setEditingTemplateMeta({
                        ...editingTemplateMeta,
                        component: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Model (or ALL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HD785-7 or ALL"
                    value={editingTemplateMeta.unitModel || 'ALL'}
                    onChange={(e) =>
                      setEditingTemplateMeta({
                        ...editingTemplateMeta,
                        unitModel: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 uppercase focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Create Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit Section */}
      {showSectionModal && editingSection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingSection.id ? 'Rename Section' : 'Add New Section'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSectionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSectionSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Air System & Turbocharger, Pressure Check"
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add / Edit Check Item */}
      {showItemModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>{editingItem.itemName ? 'Edit Check Item' : 'Add Check Item'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Description / Check Point *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine Low Idle RPM, Main Relief Valve Pressure"
                  value={editingItem.itemName || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, itemName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Input Type *
                  </label>
                  <select
                    value={editingItem.inputType || 'GOOD / NOT GOOD'}
                    onChange={(e) => {
                      const it = e.target.value as TrialInputType;
                      setEditingItem({
                        ...editingItem,
                        inputType: it,
                        validation: it === 'Numeric' ? editingItem.validation || 'NONE' : 'NONE',
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none font-bold"
                  >
                    <option value="GOOD / NOT GOOD">GOOD / NOT GOOD (Judgment)</option>
                    <option value="Numeric">Numeric (Value Measurement)</option>
                    <option value="Visual">Visual (Check Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit of Measure (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rpm, °C, bar, kg/cm2, mm"
                    value={editingItem.unit || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Numeric Validation Configuration (Phase 1.4) */}
              {editingItem.inputType === 'Numeric' && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900">
                      Numeric Standard & Validation Mode:
                    </label>
                  </div>

                  <select
                    value={editingItem.validation || 'NONE'}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        validation: e.target.value as NumericValidationType,
                      })
                    }
                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none"
                  >
                    <option value="NONE">NONE (No Standard / Record actual value only)</option>
                    <option value="RANGE">RANGE (Minimum ~ Maximum)</option>
                    <option value="MINIMUM">MINIMUM (≥ Min Value)</option>
                    <option value="MAXIMUM">MAXIMUM (≤ Max Value)</option>
                    <option value="TARGET_TOLERANCE">TARGET_TOLERANCE (Target ± Tolerance)</option>
                  </select>

                  {editingItem.validation === 'NONE' && (
                    <p className="text-[11px] text-amber-800 italic">
                      Operator only enters the measured number. No &quot;Spec Pending&quot; or Pass/Fail judgment will be enforced.
                    </p>
                  )}

                  {editingItem.validation === 'RANGE' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                          Min Value *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 700"
                          value={editingItem.minimumValue ?? ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              minimumValue: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                          Max Value *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 800"
                          value={editingItem.maximumValue ?? ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              maximumValue: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {editingItem.validation === 'MINIMUM' && (
                    <div className="pt-1">
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Minimum Permissible Value (≥) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 150"
                        value={editingItem.minimumValue ?? ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            minimumValue: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  )}

                  {editingItem.validation === 'MAXIMUM' && (
                    <div className="pt-1">
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Maximum Permissible Value (≤) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 95"
                        value={editingItem.maximumValue ?? ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            maximumValue: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  )}

                  {editingItem.validation === 'TARGET_TOLERANCE' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                          Target Value *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 210"
                          value={editingItem.targetValue ?? ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              targetValue: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                          ± Tolerance *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 5"
                          value={editingItem.toleranceValue ?? ''}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              toleranceValue: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.mandatory ?? true}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, mandatory: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Mandatory Check</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.active ?? true}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, active: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Active Item</span>
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
