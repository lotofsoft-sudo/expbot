import React, { useState } from 'react';
import { AppUser, UserRole } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  Mail,
  Phone,
  Building2,
  Key,
  CreditCard,
  X,
  Check,
  AlertCircle,
  Copy,
  Send,
  Lock,
  Briefcase
} from 'lucide-react';

interface EmployeeDirectoryViewProps {
  users: AppUser[];
  currentUser: AppUser;
  onSaveUser: (user: AppUser) => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onSelectCurrentUser?: (user: AppUser) => void;
}

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onSelectCurrentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AppUser | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    uid: string;
    displayName: string;
    iqama: string;
    email: string;
    password: string;
    role: UserRole;
    employeeId: string;
    department: string;
    designation: string;
    phone: string;
    telegramHandle: string;
  }>({
    uid: '',
    displayName: '',
    iqama: '',
    email: '',
    password: '',
    role: 'employee',
    employeeId: '',
    department: 'Field Operations',
    designation: 'Officer',
    phone: '',
    telegramHandle: ''
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle password visibility for specific employee
  const togglePasswordVisibility = (uid: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  // Copy text helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open modal for new employee
  const handleOpenAddModal = () => {
    const nextEmpNum = 4020 + users.length + 1;
    setEditingUser(null);
    setFormData({
      uid: `emp-${Date.now()}`,
      displayName: '',
      iqama: '',
      email: '',
      password: `Pass@${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'employee',
      employeeId: `KSA-${nextEmpNum}`,
      department: 'Sales & Field Operations (Riyadh)',
      designation: 'Field Executive',
      phone: '+966 50 ',
      telegramHandle: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for editing employee
  const handleOpenEditModal = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      uid: user.uid,
      displayName: user.displayName || '',
      iqama: user.iqama || '',
      email: user.email || '',
      password: user.password || 'UserPass@2026',
      role: user.role || 'employee',
      employeeId: user.employeeId || `KSA-${Math.floor(4020 + Math.random() * 100)}`,
      department: user.department || 'General Operations',
      designation: user.designation || 'Staff',
      phone: user.phone || '',
      telegramHandle: user.telegramHandle || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.displayName.trim()) {
      setFormError('Employee name is required.');
      return;
    }
    if (!formData.iqama.trim()) {
      setFormError('Iqama / National ID number is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }
    if (!formData.password.trim()) {
      setFormError('Login password is required.');
      return;
    }

    setIsSubmitting(true);

    const userToSave: AppUser = {
      uid: formData.uid,
      displayName: formData.displayName.trim(),
      iqama: formData.iqama.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password.trim(),
      role: formData.role,
      employeeId: formData.employeeId.trim(),
      department: formData.department.trim(),
      designation: formData.designation.trim(),
      phone: formData.phone.trim(),
      telegramHandle: formData.telegramHandle.trim(),
      updatedAt: new Date().toISOString()
    };

    const success = await onSaveUser(userToSave);
    setIsSubmitting(false);

    if (success) {
      setIsModalOpen(false);
    } else {
      setFormError('Failed to save employee data. Please try again.');
    }
  };

  // Handle Employee Deletion
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return;
    setIsSubmitting(true);
    const success = await onDeleteUser(deleteConfirmUser.uid);
    setIsSubmitting(false);
    if (success) {
      setDeleteConfirmUser(null);
    }
  };

  // Generate random strong password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let pass = 'KSA';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  const isAdmin = currentUser.role === 'admin';

  // Base list depending on role: Admins see all, employees see only themselves
  const visibleUserList = isAdmin
    ? users
    : users.filter((u) => u.uid === currentUser.uid || u.email.toLowerCase() === currentUser.email.toLowerCase());

  // Fallback to ensure current user is always visible to themselves
  const finalUserList = visibleUserList.length > 0 ? visibleUserList : [currentUser];

  // Filtered users list (for Admin search and role filter)
  const filteredUsers = finalUserList.filter((u) => {
    if (!isAdmin) return true; // Non-admins always see their own profile

    const matchRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return matchRole;

    const matchName = u.displayName.toLowerCase().includes(q);
    const matchIqama = (u.iqama || '').toLowerCase().includes(q);
    const matchEmail = u.email.toLowerCase().includes(q);
    const matchEmpId = (u.employeeId || '').toLowerCase().includes(q);
    const matchDept = (u.department || '').toLowerCase().includes(q);

    return matchRole && (matchName || matchIqama || matchEmail || matchEmpId || matchDept);
  });

  // Role color helper
  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approver':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-bold border border-emerald-500/30">
                {isAdmin ? 'Admin Control • Staff Management' : 'Personal Profile • Private Access'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-400" />
              <span>{isAdmin ? 'Employee Directory' : 'My Employee Profile'}</span>
            </h2>
            <p className="text-emerald-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {isAdmin
                ? 'Manage complete employee profiles including Saudi Iqama / National ID numbers, login credentials, departments, and system access permissions.'
                : 'View and update your personal employee details, Saudi Iqama / National ID number, contact info, and login credentials.'}
            </p>
          </div>

          {isAdmin ? (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 cursor-pointer shrink-0"
            >
              <UserPlus className="w-5 h-5 text-emerald-950 stroke-[2.5]" />
              <span>Add New Employee</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenEditModal(currentUser)}
              className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 cursor-pointer shrink-0 border border-emerald-500/40"
            >
              <Edit2 className="w-4.5 h-4.5 text-emerald-200" />
              <span>Edit My Profile</span>
            </button>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-emerald-700/50">
          {isAdmin ? (
            <>
              <div className="bg-emerald-950/40 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-700/40">
                <div className="text-xs text-emerald-300 font-medium">Total Staff</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">{users.length}</div>
              </div>
              <div className="bg-emerald-950/40 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-700/40">
                <div className="text-xs text-emerald-300 font-medium">Field Employees</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                  {users.filter((u) => u.role === 'employee').length}
                </div>
              </div>
              <div className="bg-emerald-950/40 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-700/40">
                <div className="text-xs text-emerald-300 font-medium">Approvers & Admins</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                  {users.filter((u) => u.role === 'approver' || u.role === 'admin').length}
                </div>
              </div>
              <div className="bg-emerald-950/40 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-700/40">
                <div className="text-xs text-emerald-300 font-medium">Iqama Registered</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-300 mt-0.5">
                  {users.filter((u) => u.iqama && u.iqama.length > 3).length}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-emerald-950/40 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-700/40">
                <div className="text-xs text-emerald-300 font-medium">Employee Name</div>
                <div className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">{currentUser.displayName}</div>
              </div>
              <div className="bg-emerald-950/40 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-700/40">
                <div className="text-xs text-emerald-300 font-medium">Iqama Number</div>
                <div className="text-base sm:text-lg font-mono font-bold text-amber-300 mt-0.5">{currentUser.iqama || 'N/A'}</div>
              </div>
              <div className="bg-emerald-950/40 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-700/40">
                <div className="text-xs text-emerald-300 font-medium">Employee ID</div>
                <div className="text-base sm:text-lg font-mono font-bold text-white mt-0.5">{currentUser.employeeId || 'N/A'}</div>
              </div>
              <div className="bg-emerald-950/40 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-700/40">
                <div className="text-xs text-emerald-300 font-medium">Access Role</div>
                <div className="text-base sm:text-lg font-bold text-emerald-300 uppercase mt-0.5">{currentUser.role}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Non-Admin Privacy Banner */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-900 shadow-xs">
          <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">
              🔒 গোপনীয়তা সুরক্ষা: শুধুমাত্র আপনার নিজস্ব প্রোফাইল দৃশ্যমান (Privacy Protected)
            </p>
            <p className="text-amber-800 text-xs">
              একজন সাধারণ এমপ্লয়ি হিসেবে আপনি শুধুমাত্র আপনার নিজের ইকামা, ইমেইল, পাসওয়ার্ড ও প্রোফাইল তথ্য দেখতে এবং আপডেট করতে পারবেন। সমস্ত এমপ্লয়ির তালিকা দেখার জন্য অ্যাডমিন অ্যাকাউন্টে লগইন করুন।
            </p>
            <p className="text-amber-700/80 text-[11px] italic">
              (As an Employee, you can only view your own personal profile. Admin authorization is required to view all staff records.)
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Name, Iqama, Email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: `All (${users.length})` },
              { id: 'employee', label: `Employees (${users.filter((u) => u.role === 'employee').length})` },
              { id: 'approver', label: `Approvers (${users.filter((u) => u.role === 'approver').length})` },
              { id: 'admin', label: `Admins (${users.filter((u) => u.role === 'admin').length})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedRoleFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedRoleFilter === f.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Employee Directory Table / Cards */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm font-bold text-emerald-950">
              Registered Staff Profiles ({filteredUsers.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Real-time synced with Firebase Firestore
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600">No employees match your search criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRoleFilter('all');
              }}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Iqama / ID No.</th>
                  <th className="py-3.5 px-4">Email Address</th>
                  <th className="py-3.5 px-4">Login Password</th>
                  <th className="py-3.5 px-4">Role & Dept</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((emp) => {
                  const isPasswordVisible = showPasswordMap[emp.uid] || false;
                  const isCurrent = emp.uid === currentUser.uid;

                  return (
                    <tr
                      key={emp.uid}
                      className={`hover:bg-emerald-50/40 transition-colors ${
                        isCurrent ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                            {emp.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{emp.displayName}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-emerald-800 font-semibold">{emp.employeeId || 'KSA-N/A'}</span>
                              {emp.designation && (
                                <>
                                  <span>•</span>
                                  <span>{emp.designation}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Iqama / National ID */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        {emp.iqama ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            <span>{emp.iqama}</span>
                            <button
                              onClick={() => handleCopy(emp.iqama!, `iqama-${emp.uid}`)}
                              className="ml-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                              title="Copy Iqama Number"
                            >
                              {copiedField === `iqama-${emp.uid}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Not set</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{emp.email}</span>
                        </div>
                        {emp.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Login Password */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900">
                            {isPasswordVisible ? (
                              emp.password || 'UserPass@2026'
                            ) : (
                              '••••••••'
                            )}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(emp.uid)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isPasswordVisible && (
                            <button
                              onClick={() => handleCopy(emp.password || 'UserPass@2026', `pass-${emp.uid}`)}
                              className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                              title="Copy Password"
                            >
                              {copiedField === `pass-${emp.uid}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Role & Dept */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide ${getRoleBadgeClass(
                              emp.role
                            )}`}
                          >
                            {emp.role}
                          </span>
                          <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                            {emp.department || 'General Operations'}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && onSelectCurrentUser && !isCurrent && (
                            <button
                              onClick={() => onSelectCurrentUser(emp)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer border border-emerald-200"
                              title="Login / Switch to this user"
                            >
                              Login
                            </button>
                          )}

                          {(isAdmin || isCurrent) && (
                            <button
                              onClick={() => handleOpenEditModal(emp)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Edit Profile Details"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                          )}

                          {isAdmin && !isCurrent && (
                            <button
                              onClick={() => setDeleteConfirmUser(emp)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-100"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-5 animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  {editingUser ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingUser ? 'Edit Employee Details' : 'Add New Employee'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUser ? 'Update staff profile and credentials' : 'Create a new employee profile with login details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Employee Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Tariq Al-Mansoor"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              {/* Iqama Number & Employee ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Iqama / National ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.iqama}
                    onChange={(e) => setFormData({ ...formData, iqama: e.target.value })}
                    placeholder="e.g. 2418920192"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g. KSA-4025"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Email & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. employee@alfalak.sa"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Login Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="e.g. UserPass@2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role & Permissions {!isAdmin && '(Admin Managed)'}
                  </label>
                  <select
                    value={formData.role}
                    disabled={!isAdmin}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className={`w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <option value="employee">Employee (Submit Expenses)</option>
                    <option value="approver">Approver (Review & Approve)</option>
                    <option value="admin">System Admin (Full Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Senior Sales Officer"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Sales & Field Operations (Riyadh)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Phone & Telegram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+966 50 123 4567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telegram Handle
                  </label>
                  <input
                    type="text"
                    value={formData.telegramHandle}
                    onChange={(e) => setFormData({ ...formData, telegramHandle: e.target.value })}
                    placeholder="@username"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingUser ? 'Update Employee' : 'Save New Employee'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete Employee Profile?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{deleteConfirmUser.displayName}</strong> ({deleteConfirmUser.employeeId})? This action will remove their profile from Firestore.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
