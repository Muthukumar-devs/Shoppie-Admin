'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Ticket, Upload } from 'lucide-react';
import { getOffers, createOffer, updateOffer, deleteOffer, getCategories } from '@/lib/api';
import type { Offer, Category } from '@/lib/types';
import {
  PageLoader, Badge, Modal, ConfirmDialog, EmptyState,
  FormField, Input, Textarea, Select, Button,
} from '@/components/ui';

const emptyForm = {
  title: '', description: '', discountPercentage: '',
  isActive: 'true', validUntil: '', applicableCategory: '',
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Offer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await getOffers();
      setOffers(res.data.data.offers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [offersRes, catsRes] = await Promise.all([getOffers(), getCategories()]);
        if (!cancelled) {
          setOffers(offersRes.data.data.offers);
          setCategories(catsRes.data.data.categories);
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
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (o: Offer) => {
    setEditTarget(o);
    setError('');
    setImageFile(null);
    setImagePreview(o.image?.url ?? '');
    setForm({
      title: o.title,
      description: o.description,
      discountPercentage: String(o.discountPercentage),
      isActive: String(o.isActive),
      validUntil: o.validUntil.slice(0, 10),
      applicableCategory: o.applicableCategory
        ? (typeof o.applicableCategory === 'object' ? o.applicableCategory._id : o.applicableCategory)
        : '',
    });
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('discountPercentage', form.discountPercentage);
      fd.append('isActive', form.isActive);
      fd.append('validUntil', form.validUntil);
      if (form.applicableCategory) fd.append('applicableCategory', form.applicableCategory);
      if (imageFile) fd.append('image', imageFile);

      if (editTarget) {
        await updateOffer(editTarget._id, fd);
      } else {
        await createOffer(fd);
      }
      setModalOpen(false);
      fetchOffers();
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
    try {
      await deleteOffer(deleteTarget._id);
      setDeleteTarget(null);
      fetchOffers();
    } finally {
      setDeleteLoading(false);
    }
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{offers.length} offers</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Offer
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : offers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState message="No offers found" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((o) => (
            <div key={o._id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Image */}
              <div className="relative h-40 bg-gradient-to-br from-indigo-50 to-indigo-100">
                {o.image?.url ? (
                  <Image src={o.image.url} alt={o.title} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Ticket className="h-12 w-12 text-indigo-300" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge label={`${o.discountPercentage}% OFF`} variant="info" />
                  {isExpired(o.validUntil) && <Badge label="Expired" variant="danger" />}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{o.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{o.description}</p>
                  </div>
                  <Badge label={o.isActive ? 'Active' : 'Inactive'} variant={o.isActive ? 'success' : 'danger'} />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Valid until {new Date(o.validUntil).toLocaleDateString()}</span>
                  {o.applicableCategory && (
                    <span className="text-indigo-500">
                      {typeof o.applicableCategory === 'object' ? o.applicableCategory.name : ''}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => openEdit(o)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(o)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-100 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Offer' : 'Add Offer'} size="lg">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Title" required className="col-span-2">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Offer title" />
            </FormField>
            <FormField label="Description" required className="col-span-2">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Offer description" />
            </FormField>
            <FormField label="Discount %" required>
              <Input type="number" value={form.discountPercentage} onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} placeholder="0-100" min="0" max="100" />
            </FormField>
            <FormField label="Valid Until" required>
              <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </FormField>
            <FormField label="Applicable Category">
              <Select value={form.applicableCategory} onChange={(e) => setForm({ ...form, applicableCategory: e.target.value })}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.value })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </FormField>
            <FormField label="Image" className="col-span-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> {editTarget ? 'Replace Image' : 'Upload Image'}
              </Button>
              {imagePreview && (
                <div className="mt-2">
                  <Image src={imagePreview} alt="preview" width={120} height={80} className="h-20 w-32 rounded-lg object-cover border border-slate-200" />
                </div>
              )}
            </FormField>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editTarget ? 'Save Changes' : 'Create Offer'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Offer"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
      />
    </div>
  );
}
