'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Upload, ImageIcon } from 'lucide-react';
import {
  getCategories, createCategory, updateCategory, deleteCategory, deleteMultipleCategories,
  getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory, deleteMultipleSubCategories,
  bulkUploadCategories, bulkUploadSubCategories,
} from '@/lib/api';
import type { Category, SubCategory } from '@/lib/types';
import {
  PageLoader, Badge, Modal, ConfirmDialog, EmptyState,
  FormField, Input, Textarea, Select, Button,
} from '@/components/ui';
import BulkUploadModal, { type BulkResult } from '@/components/ui/BulkUploadModal';

type Tab = 'categories' | 'subcategories';

export default function CategoriesPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | SubCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', isActive: 'true' });
  const [subForm, setSubForm] = useState({ name: '', category: '', description: '', isActive: 'true' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | SubCategory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catRes, subRes] = await Promise.all([getCategories(), getSubCategories()]);
      setCategories(catRes.data.data.categories);
      setSubCategories(subRes.data.data.subCategories);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [catRes, subRes] = await Promise.all([getCategories(), getSubCategories()]);
        if (!cancelled) {
          setCategories(catRes.data.data.categories);
          setSubCategories(subRes.data.data.subCategories);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setCatForm({ name: '', description: '', isActive: 'true' });
    setSubForm({ name: '', category: '', description: '', isActive: 'true' });
    setImageFile(null);
    setImagePreview('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item: Category | SubCategory) => {
    setEditTarget(item);
    setImageFile(null);
    setError('');
    if (tab === 'categories') {
      const c = item as Category;
      setCatForm({ name: c.name, description: c.description ?? '', isActive: String(c.isActive) });
      setImagePreview(c.image?.url ?? '');
    } else {
      const s = item as SubCategory;
      setSubForm({
        name: s.name,
        category: typeof s.category === 'object' ? s.category._id : s.category,
        description: s.description ?? '',
        isActive: String(s.isActive),
      });
      setImagePreview(s.image?.url ?? '');
    }
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    if (tab === 'categories') {
      fd.append('name', catForm.name);
      if (catForm.description) fd.append('description', catForm.description);
      fd.append('isActive', catForm.isActive);
    } else {
      fd.append('name', subForm.name);
      fd.append('category', subForm.category);
      if (subForm.description) fd.append('description', subForm.description);
      fd.append('isActive', subForm.isActive);
    }
    if (imageFile) fd.append('image', imageFile);
    return fd;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const fd = buildFormData();
      if (tab === 'categories') {
        if (editTarget) await updateCategory(editTarget._id, fd);
        else await createCategory(fd);
      } else {
        if (editTarget) await updateSubCategory(editTarget._id, fd);
        else await createSubCategory(fd);
      }
      setModalOpen(false);
      fetchAll();
    } catch (err: unknown) {
      const axiosMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(axiosMessage ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError('');
    try {
      if (tab === 'categories') await deleteCategory(deleteTarget._id);
      else await deleteSubCategory(deleteTarget._id);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteTarget._id); return n; });
      setDeleteTarget(null);
      fetchAll();
    } catch (err: unknown) {
      const axiosMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(axiosMessage ?? 'Cannot delete');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    setError('');
    try {
      if (tab === 'categories') await deleteMultipleCategories(Array.from(selectedIds));
      else await deleteMultipleSubCategories(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      fetchAll();
    } catch (err: unknown) {
      const axiosMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(axiosMessage ?? 'Cannot delete selected items');
      setBulkDeleteOpen(false);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const currentList = tab === 'categories' ? categories : subCategories;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(currentList.map(i => i._id)));
  };

  const handleBulkUpload = async (file: File): Promise<BulkResult> => {
    const res = tab === 'categories'
      ? await bulkUploadCategories(file)
      : await bulkUploadSubCategories(file);
    return res.data.data as BulkResult;
  };

  const csvHint = tab === 'categories'
    ? 'name, description (optional), isActive (optional)'
    : 'name, categoryName, description (optional), isActive (optional)';

  const csvExample = tab === 'categories'
    ? `name,description,isActive\nElectronics,Electronic items,true\nClothing,,true`
    : `name,categoryName,description,isActive\nPhones,Electronics,Mobile phones,true\nShirts,Clothing,,true`;

  return (
    <div className="space-y-4">
      {/* Tabs + Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 gap-1">
          {(['categories', 'subcategories'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedIds(new Set()); }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="secondary" onClick={() => setBulkModalOpen(true)}>
            <Upload className="h-4 w-4" /> Bulk Upload
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add {tab === 'categories' ? 'Category' : 'Sub Category'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : tab === 'categories' ? (
          categories.length === 0 ? <EmptyState message="No categories found" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.size === categories.length && categories.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c._id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(c._id) ? 'bg-indigo-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(c._id)} onChange={() => toggleSelect(c._id)} className="rounded border-slate-300" />
                    </td>
                    <td className="px-6 py-3">
                      {c.image?.url ? (
                        <Image src={c.image.url} alt={c.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-6 py-3 text-slate-500 max-w-xs truncate">{c.description || '—'}</td>
                    <td className="px-6 py-3">
                      <Badge label={c.isActive ? 'Active' : 'Inactive'} variant={c.isActive ? 'success' : 'danger'} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          subCategories.length === 0 ? <EmptyState message="No sub-categories found" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.size === subCategories.length && subCategories.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subCategories.map((s) => (
                  <tr key={s._id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(s._id) ? 'bg-indigo-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(s._id)} onChange={() => toggleSelect(s._id)} className="rounded border-slate-300" />
                    </td>
                    <td className="px-6 py-3">
                      {s.image?.url ? (
                        <Image src={s.image.url} alt={s.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {typeof s.category === 'object' ? s.category.name : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <Badge label={s.isActive ? 'Active' : 'Inactive'} variant={s.isActive ? 'success' : 'danger'} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editTarget ? 'Edit' : 'Add'} ${tab === 'categories' ? 'Category' : 'Sub Category'}`}
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          {tab === 'categories' ? (
            <>
              <FormField label="Name" required>
                <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Category name" />
              </FormField>
              <FormField label="Description">
                <Textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} placeholder="Optional description" />
              </FormField>
              <FormField label="Status">
                <Select value={catForm.isActive} onChange={(e) => setCatForm({ ...catForm, isActive: e.target.value })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Name" required>
                <Input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} placeholder="Sub category name" />
              </FormField>
              <FormField label="Category" required>
                <Select value={subForm.category} onChange={(e) => setSubForm({ ...subForm, category: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Description">
                <Textarea value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} placeholder="Optional description" />
              </FormField>
              <FormField label="Status">
                <Select value={subForm.isActive} onChange={(e) => setSubForm({ ...subForm, isActive: e.target.value })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </FormField>
            </>
          )}

          {/* Image upload */}
          <FormField label="Image">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> {editTarget ? 'Replace Image' : 'Upload Image'}
            </Button>
            {imagePreview && (
              <div className="mt-2">
                <Image src={imagePreview} alt="preview" width={80} height={80} className="h-20 w-20 rounded-lg object-cover border border-slate-200" />
              </div>
            )}
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editTarget ? 'Save Changes' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Bulk Upload ${tab === 'categories' ? 'Categories' : 'Sub Categories'}`}
        csvHint={csvHint}
        csvExample={csvExample}
        sampleFile={tab === 'categories' ? '/csv-samples/categories.csv' : '/csv-samples/subcategories.csv'}
        onUpload={handleBulkUpload}
        onSuccess={fetchAll}
      />

      {/* Single Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title={`Delete ${tab === 'categories' ? 'Category' : 'Sub Category'}`}
        message={`Are you sure you want to delete "${(deleteTarget as Category | SubCategory)?.name}"? This cannot be undone.`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkDeleteLoading}
        title={`Delete Selected ${tab === 'categories' ? 'Categories' : 'Sub Categories'}`}
        message={`Are you sure you want to delete ${selectedIds.size} selected item(s)? This cannot be undone.`}
      />
    </div>
  );
}
