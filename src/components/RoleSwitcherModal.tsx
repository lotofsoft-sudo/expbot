import React, { useState } from 'react';
import { AppUser } from '../types';
import { User, Shield, Check, UserCheck, UserPlus, Building2 } from 'lucide-react';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  users?: AppUser[];
  onSelectUser: (user: AppUser) => void;
  onSaveUser?: (user: AppUser) => Promise<boolean>;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = [],
  onSelectUser,
  onSaveUser
}) => {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newId, setNewId] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newDept, setNewDept] = useState<string>('Sales & Field Operations');
  const [newRole, setNewRole] = useState<'employee' | 'approver' | 'admin'>('employee');

  if (!isOpen) return null;

  const displayUsers = users.length > 0 ? users : [];

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newId.trim() || !onSaveUser) return;

    const user: AppUser = {
      uid: `usr_${Date.now()}`,
      displayName: newName.trim(),
      employeeId: newId.trim(),
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@alfalak.sa`,
      department: newDept.trim(),
      role: newRole,
      telegramHandle: `@${newName.toLowerCase().replace(/\s+/g, '_')}`
    };

    await onSaveUser(user);
    onSelectUser(user);
    setShowAddForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl border border-emerald-200 max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-700 block">
              User & Employee Profile Switcher
            </span>
            <h3 className="text-xl font-bold text-emerald-950">
              এমপ্লয়ি নির্বাচন / প্রোফাইল পরিবর্তন
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {!showAddForm ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-emerald-800 font-medium">
                যে কোনো এমপ্লয়ির অ্যাকাউন্টে সুইচ করতে ক্লিক করুন:
              </p>
              {onSaveUser && (
                <button
                  onClick={() => {
                    setNewId(`KSA-${Math.floor(4020 + displayUsers.length + 1)}`);
                    setShowAddForm(true);
                  }}
                  className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>নতুন এমপ্লয়ি</span>
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs max-h-[50vh] overflow-y-auto pr-1">
              {displayUsers.map((usr) => {
                const isSelected = usr.uid === currentUser.uid;
                return (
                  <button
                    key={usr.uid}
                    onClick={() => {
                      onSelectUser(usr);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-emerald-800 text-white border-emerald-700'
                        : 'bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-950 border-emerald-200/80'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm flex items-center gap-2">
                        <span>{usr.displayName}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                            isSelected
                              ? 'bg-emerald-500 text-emerald-950'
                              : 'bg-emerald-200 text-emerald-900'
                          }`}
                        >
                          {usr.role}
                        </span>
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                        {usr.email}
                      </div>
                      <div className={`text-[11px] font-medium flex items-center gap-2 ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>
                        <span className="font-mono font-bold bg-emerald-900/30 px-1.5 py-0.2 rounded">
                          আইডি: {usr.employeeId}
                        </span>
                        <span>• {usr.department}</span>
                      </div>
                    </div>

                    {isSelected && <Check className="w-5 h-5 text-emerald-300 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* Inline Add Employee Form */
          <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
            <div className="font-bold text-sm text-emerald-950 border-b border-emerald-100 pb-1">
              নতুন এমপ্লয়ি তথ্য যুক্ত করুন
            </div>

            <div className="space-y-1">
              <label className="font-bold text-emerald-900 block">পূর্ণ নাম *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq Al-Mansoor"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-emerald-900 block">ইউনিক এমপ্লয়ি আইডি *</label>
              <input
                type="text"
                required
                placeholder="e.g. KSA-4025"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-emerald-900 block">ইমেইল ঠিকানা</label>
              <input
                type="email"
                placeholder="employee@alfalak.sa"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-emerald-900 block">ডিপার্টমেন্ট / বিভাগ</label>
              <input
                type="text"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-emerald-900 block">রোল / পারমিশন</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="employee">Employee (খরচ দাখিলকারী)</option>
                <option value="approver">Approver / Manager (অনুমোদনকারী)</option>
                <option value="admin">Admin (প্রশাসক)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 font-bold hover:bg-emerald-50 cursor-pointer"
              >
                ফিরে যান
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer shadow-xs"
              >
                সংরক্ষণ ও সুইচ করুন
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
