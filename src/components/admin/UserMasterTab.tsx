import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  KeyRound,
  ShieldCheck,
  Save,
  X,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface UserMasterTabProps {
  users: User[];
  onSaveUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onChangePassword: (userId: string, newPass: string) => Promise<boolean>;
}

const ROLES: { id: UserRole; label: string; desc: string; badge: string }[] = [
  { id: 'ADMIN', label: 'ADMIN', desc: 'Full System Master Data & Config', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'SUPERVISOR', label: 'SUPERVISOR', desc: 'Operational Oversight & Quality Approvals', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'PPC', label: 'PPC', desc: 'Production Planning, Priority Queue & Intake', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'OPERATOR', label: 'OPERATOR', desc: 'Testing Bench Operator (GLT, Dyno, Hyd)', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'QC', label: 'QC', desc: 'Quality Control Inspector & Audit', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
];

export const UserMasterTab: React.FC<UserMasterTabProps> = ({
  users,
  onSaveUser,
  onDeleteUser,
  onChangePassword,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  // Password Modal
  const [showPassModal, setShowPassModal] = useState(false);
  const [passTargetUser, setPassTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passFeedback, setPassFeedback] = useState('');

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const filteredUsers = users.filter((u) => {
    const r = (u.role || '').toUpperCase();
    const matchRole = roleFilter === 'ALL' || r === roleFilter || (roleFilter === 'ADMIN' && r === 'ADMINISTRATOR');
    const q = searchQuery.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.section && u.section.toLowerCase().includes(q));

    return matchRole && matchSearch;
  });

  const getBadgeStyle = (role: string) => {
    const r = (role || '').toUpperCase();
    const found = ROLES.find((item) => item.id === r);
    if (found) return found.badge;
    if (r === 'ADMINISTRATOR') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const handleOpenAdd = () => {
    setEditingUser({
      id: `usr-${Date.now()}`,
      name: '',
      username: '',
      role: 'OPERATOR',
      section: 'Testing Station',
      active: true,
      password: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser({ ...user });
    setShowModal(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.name || !editingUser.username || !editingUser.role) return;

    await onSaveUser({
      id: editingUser.id || `usr-${Date.now()}`,
      name: editingUser.name.trim(),
      username: editingUser.username.trim().toLowerCase(),
      role: editingUser.role as UserRole,
      section: editingUser.section?.trim() || 'Testing Section',
      active: editingUser.active ?? true,
      password: editingUser.password || undefined,
    });

    setShowModal(false);
    setEditingUser(null);
  };

  const handleToggleActive = async (user: User) => {
    await onSaveUser({ ...user, active: !user.active });
  };

  const handleOpenPassReset = (user: User) => {
    setPassTargetUser(user);
    setNewPassword('');
    setPassFeedback('');
    setShowPassModal(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passTargetUser || !newPassword.trim()) return;

    const success = await onChangePassword(passTargetUser.id, newPassword.trim());
    if (success) {
      setPassFeedback('Password successfully updated!');
      setTimeout(() => {
        setShowPassModal(false);
        setPassTargetUser(null);
      }, 1000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteUser(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, username, section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none font-semibold"
            >
              <option value="ALL">All Roles ({ROLES.length})</option>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add User Account</span>
            </button>
          </div>
        </div>

        {/* Roles overview pill tags */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
          {ROLES.map((r) => (
            <div key={r.id} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <div className="font-bold text-slate-900">{r.label}</div>
              <div className="text-[9px] text-slate-500 truncate">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Authorized User</th>
                <th className="py-2.5 px-3">Username (Login ID)</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Section</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No user accounts found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const r = (user.role || '').toUpperCase();
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div>{user.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">System User</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        @{user.username}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(
                            user.role
                          )}`}
                        >
                          {r}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {user.section || 'General'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            user.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {user.active ? (
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
                            onClick={() => handleOpenPassReset(user)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(user)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete User"
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

      {/* Edit / Create User Modal */}
      {showModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{editingUser.name ? 'Edit User Account' : 'Add New User Account'}</span>
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
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zakaria, Vaiz, Sarah Connor"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username (Login Identifier) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. zakaria, vaiz, operator1"
                  value={editingUser.username || ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().trim() })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    System Role *
                  </label>
                  <select
                    value={(editingUser.role || 'OPERATOR').toUpperCase()}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-bold focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Quality Control, PPC Dept"
                    value={editingUser.section || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, section: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Set initial password"
                  value={editingUser.password || ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, password: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="usr-active"
                  checked={editingUser.active ?? true}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, active: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="usr-active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Active (Allowed to sign into AQuality PRO)
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPassModal && passTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Reset User Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Set new password for <strong className="text-slate-900">{passTargetUser.name}</strong> (@{passTargetUser.username}):
            </p>

            {passFeedback && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                {passFeedback}
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-3">
              <input
                type="password"
                required
                placeholder="Enter new password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                autoFocus
              />

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Delete User Account?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{deleteTarget.name}</strong> (@{deleteTarget.username})?
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
