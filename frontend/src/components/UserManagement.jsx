import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Trash2, RefreshCw, Shield, Eye,
  Copy, Check, AlertCircle, KeyRound
} from 'lucide-react';
import { listUsers, createUser, deleteUser, updateUserRole, resetUserPassword } from '../api';

export default function UserManagement({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create user state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  // Copy state
  const [copiedId, setCopiedId] = useState(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Reset password result
  const [resetResult, setResetResult] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    const result = await listUsers();
    if (result.status === 'success') {
      setUsers(result.users);
    } else {
      setError(result.message || 'Failed to load users');
    }
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    const result = await createUser(newEmail, newRole);

    if (result.status === 'success') {
      setCreateResult({
        email: result.user.email,
        tempPassword: result.temp_password
      });
      setNewEmail('');
      setNewRole('viewer');
      loadUsers();
    } else {
      setError(result.message || 'Failed to create user');
    }

    setCreating(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    const result = await updateUserRole(userId, newRole);
    if (result.status === 'success') {
      loadUsers();
    } else {
      setError(result.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId) => {
    const result = await deleteUser(userId);
    if (result.status === 'success') {
      setDeleteConfirm(null);
      loadUsers();
    } else {
      setError(result.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId) => {
    const result = await resetUserPassword(userId);
    if (result.status === 'success') {
      setResetResult({
        email: result.email,
        tempPassword: result.temp_password
      });
    } else {
      setError(result.message || 'Failed to reset password');
    }
  };

  const copyToClipboard = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#007C89]" />
          <h3 className="font-medium text-gray-900">User Management</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setCreateResult(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007C89] hover:bg-[#006570] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          {createResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="font-medium">User created successfully!</span>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Share these credentials with the new user:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm"><strong>Email:</strong> {createResult.email}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm"><strong>Temp Password:</strong> {createResult.tempPassword}</span>
                    <button
                      onClick={() => copyToClipboard(createResult.tempPassword, 'create-pwd')}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {copiedId === 'create-pwd' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  User will be required to change password on first login
                </p>
              </div>
              <button
                onClick={() => {
                  setCreateResult(null);
                  setShowCreateForm(false);
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007C89] focus:border-transparent"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007C89] focus:border-transparent"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#007C89] hover:bg-[#006570] disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reset Password Result */}
      {resetResult && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <KeyRound className="w-5 h-5" />
            <span className="font-medium">Password Reset</span>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-600 mb-2">New credentials for {resetResult.email}:</p>
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
              <span className="text-sm"><strong>Temp Password:</strong> {resetResult.tempPassword}</span>
              <button
                onClick={() => copyToClipboard(resetResult.tempPassword, 'reset-pwd')}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {copiedId === 'reset-pwd' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={() => setResetResult(null)}
            className="text-sm text-blue-600 hover:text-blue-800 mt-2"
          >
            Close
          </button>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Last Login</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{user.email}</span>
                      {user.id === currentUserId && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">You</span>
                      )}
                      {user.must_change_password && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Temp Password</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    {user.id === currentUserId ? (
                      <div className="flex items-center gap-1">
                        {user.role === 'admin' ? (
                          <Shield className="w-4 h-4 text-[#007C89]" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm capitalize">{user.role}</span>
                      </div>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-[#007C89] focus:border-transparent"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-500">{formatDate(user.last_login)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    {user.id !== currentUserId && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {deleteConfirm === user.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-gray-600 text-xs hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
