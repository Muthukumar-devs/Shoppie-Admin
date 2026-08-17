'use client';

import { useEffect, useState } from 'react';
import { Search, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { getUsers, updateUser, deleteUser } from '@/lib/api';
import type { User } from '@/lib/types';
import {
  PageLoader, Badge, Modal, ConfirmDialog, Pagination, EmptyState,
  FormField, Input, Select, Button,
} from '@/components/ui';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', role: 'user', isEmailVerified: false });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async (p = page, q = search) => {
    setLoading(true);
    try {
      const res = await getUsers(p, 20, q || undefined);
      setUsers(res.data.data.users);
      setPages(res.data.pages);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getUsers(page, 20, search || undefined);
        if (!cancelled) {
          setUsers(res.data.data.users);
          setPages(res.data.pages);
          setTotal(res.data.total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [page, search]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditError('');
    setEditForm({ fullName: u.fullName, phoneNumber: u.phoneNumber, role: u.role, isEmailVerified: u.isEmailVerified });
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    setEditError('');
    try {
      await updateUser(editUser._id, editForm);
      setEditUser(null);
      fetchUsers(page, search);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setEditError(msg ?? 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deleteTarget._id);
      setDeleteTarget(null);
      fetchUsers(page, search);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>Search</Button>
        {search && (
          <Button variant="secondary" onClick={handleClearSearch}>Clear</Button>
        )}
        <span className="text-sm text-slate-500 ml-auto">{total} total users</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : users.length === 0 ? (
          <EmptyState message={search ? `No users found for "${search}"` : 'No users found'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Verified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{u.fullName}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{u.phoneNumber || '—'}</td>
                      <td className="px-6 py-3">
                        <Badge label={u.role} variant={u.role === 'admin' ? 'info' : 'default'} />
                      </td>
                      <td className="px-6 py-3">
                        {u.isEmailVerified
                          ? <UserCheck className="h-4 w-4 text-emerald-500" />
                          : <UserX className="h-4 w-4 text-slate-300" />}
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={pages} total={total} onPageChange={(p) => setPage(p)} />
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <div className="space-y-4">
          {editError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{editError}</div>
          )}
          <FormField label="Full Name" required>
            <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
          </FormField>
          <FormField label="Phone Number">
            <Input value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} />
          </FormField>
          <FormField label="Role">
            <Select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
          <FormField label="Email Verified">
            <Select value={String(editForm.isEmailVerified)} onChange={(e) => setEditForm({ ...editForm, isEmailVerified: e.target.value === 'true' })}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditUser(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleEdit} loading={editLoading} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteTarget?.fullName}"? This action cannot be undone.`}
      />
    </div>
  );
}
