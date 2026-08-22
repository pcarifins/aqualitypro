import React, { useState } from 'react';
import {
  User,
  Assembler,
  ProductModel,
  ChecksheetTemplate,
  ChecksheetItem,
} from '../types';
import {
  Settings,
  Users,
  Wrench,
  Layers,
  Database,
  FileSpreadsheet,
  Activity,
} from 'lucide-react';

import { AssemblerMasterTab } from './admin/AssemblerMasterTab';
import { ProductMasterTab } from './admin/ProductMasterTab';
import { ChecksheetMasterTab } from './admin/ChecksheetMasterTab';
import { UserMasterTab } from './admin/UserMasterTab';
import { DatabaseSyncTest } from './DatabaseSyncTest';

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  assemblers: Assembler[];
  productModels: ProductModel[];
  templates: ChecksheetTemplate[];
  checksheets?: ChecksheetItem[];
  onSaveAssembler: (assembler: Assembler) => Promise<void>;
  onDeleteAssembler: (id: string) => Promise<void>;
  onSaveProductModel: (model: ProductModel) => Promise<void>;
  onDeleteProductModel: (id: string) => Promise<void>;
  onSaveTemplate: (template: ChecksheetTemplate) => Promise<void>;
  onActivateTemplate: (templateId: string) => Promise<void>;
  onCreateRevision: (templateId: string) => Promise<ChecksheetTemplate | null>;
  onDuplicateTemplate: (templateId: string) => Promise<ChecksheetTemplate | null>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onSaveUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onChangePassword: (userId: string, newPass: string) => Promise<boolean>;
  onOpenSheetsModal?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  users,
  assemblers,
  productModels,
  templates,
  onSaveAssembler,
  onDeleteAssembler,
  onSaveProductModel,
  onDeleteProductModel,
  onSaveTemplate,
  onActivateTemplate,
  onCreateRevision,
  onDuplicateTemplate,
  onDeleteTemplate,
  onSaveUser,
  onDeleteUser,
  onChangePassword,
  onOpenSheetsModal,
}) => {
  const [activeTab, setActiveTab] = useState<
    'assembler' | 'product' | 'checksheet' | 'users' | 'sync'
  >('checksheet');

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">
              Master Data & System Administration
            </h1>
            <p className="text-xs text-slate-500">
              Manage Assemblers, Product Models, Multi-level Checksheets & User RBAC
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenSheetsModal && (
            <button
              type="button"
              onClick={onOpenSheetsModal}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheets Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('checksheet')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'checksheet'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Checksheet Master</span>
          <span
            className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'checksheet'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {templates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('product')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'product'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Product Master</span>
          <span
            className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'product'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {productModels.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assembler')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'assembler'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Assembler Master</span>
          <span
            className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'assembler'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {assemblers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts & RBAC</span>
          <span
            className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'users'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sync')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sync'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-500" />
          <span>Database Sync Test</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'checksheet' && (
        <ChecksheetMasterTab
          templates={templates}
          onSaveTemplate={onSaveTemplate}
          onActivateTemplate={onActivateTemplate}
          onCreateRevision={onCreateRevision}
          onDuplicateTemplate={onDuplicateTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
      )}

      {activeTab === 'product' && (
        <ProductMasterTab
          productModels={productModels}
          onSaveProductModel={onSaveProductModel}
          onDeleteProductModel={onDeleteProductModel}
        />
      )}

      {activeTab === 'assembler' && (
        <AssemblerMasterTab
          assemblers={assemblers}
          onSaveAssembler={onSaveAssembler}
          onDeleteAssembler={onDeleteAssembler}
        />
      )}

      {activeTab === 'users' && (
        <UserMasterTab
          users={users}
          onSaveUser={onSaveUser}
          onDeleteUser={onDeleteUser}
          onChangePassword={onChangePassword}
        />
      )}

      {activeTab === 'sync' && (
        <DatabaseSyncTest currentUser={currentUser} />
      )}
    </div>
  );
};
