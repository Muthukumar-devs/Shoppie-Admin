'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, Search, Pencil, Trash2, Package, Upload, X, ImagePlus } from 'lucide-react';
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  deleteMultipleProducts, getCategories, getSubCategories, bulkUploadProducts,
  addProductImages, deleteProductImage,
} from '@/lib/api';
import type { Product, Category, SubCategory } from '@/lib/types';
import {
  PageLoader, Badge, Modal, ConfirmDialog, Pagination, EmptyState,
  FormField, Input, Textarea, Select, Button,
} from '@/components/ui';
import BulkUploadModal from '@/components/ui/BulkUploadModal';

const emptyForm = {
  name: '', description: '', price: '', mrp: '', discount: '',
  brand: '', stock: '', category: '', subCategory: '',
  highlights: '', specifications: '', isActive: 'true',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{ src: string; isExisting: boolean; public_id?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addImagesRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const fetchProducts = async (p = page, q = search) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q) params['search'] = q;
      const res = await getProducts(p, params);
      setProducts(res.data.data.products);
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
        const params: Record<string, string> = {};
        if (search) params['search'] = search;
        const res = await getProducts(page, params);
        if (!cancelled) {
          setProducts(res.data.data.products);
          setPages(res.data.pages);
          setTotal(res.data.total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    getCategories().then((r) => { if (!cancelled) setCategories(r.data.data.categories); });
    getSubCategories().then((r) => { if (!cancelled) setSubCategories(r.data.data.subCategories); });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setImageFiles([]);
    setImagePreviews([]);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      mrp: String(p.mrp),
      discount: String(p.discount),
      brand: p.brand ?? '',
      stock: String(p.stock),
      category: typeof p.category === 'object' ? p.category._id : p.category,
      subCategory: p.subCategory ? (typeof p.subCategory === 'object' ? p.subCategory._id : p.subCategory) : '',
      highlights: p.highlights?.join(', ') ?? '',
      specifications: p.specifications?.length
        ? p.specifications.map(s => `${s.key}:${s.value}`).join('\n')
        : '',
      isActive: String(p.isActive),
    });
    setImageFiles([]);
    setImagePreviews(p.images.map(img => ({ src: img.url, isExisting: true, public_id: img.public_id })));
    setError('');
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    // Replace mode for create; for edit this replaces all images
    setImageFiles(files);
    setImagePreviews(files.map(f => ({ src: URL.createObjectURL(f), isExisting: false })));
  };

  const handleAddMoreImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editTarget) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    // Reset input so same files can be re-selected
    if (addImagesRef.current) addImagesRef.current.value = '';
    try {
      await addProductImages(editTarget._id, files);
      // Append new uploaded images to previews as existing (they are now on server)
      const newPreviews = files.map(f => ({ src: URL.createObjectURL(f), isExisting: false }));
      setImagePreviews(prev => [...prev.filter(p => p.isExisting), ...newPreviews]);
      fetchProducts(page, search);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'Failed to add images');
    }
  };

  const handleRemoveExistingImage = async (public_id: string) => {
    if (!editTarget) return;
    try {
      await deleteProductImage(editTarget._id, public_id);
      setImagePreviews(prev => prev.filter(p => p.public_id !== public_id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'Failed to remove image');
    }
  };

  const handleRemoveNewImage = (previewIndex: number) => {
    // Count how many existing images are before this index to find the correct imageFiles index
    const existingBefore = imagePreviews.slice(0, previewIndex).filter(p => p.isExisting).length;
    const newFileIndex = previewIndex - existingBefore;
    setImageFiles(prev => prev.filter((_, i) => i !== newFileIndex));
    setImagePreviews(prev => prev.filter((_, i) => i !== previewIndex));
  };

  const buildSpecifications = (raw: string) => {
    if (!raw.trim()) return [];
    return raw.split('\n').map(line => {
      const idx = line.indexOf(':');
      if (idx === -1) return null;
      return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    }).filter(Boolean);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('price', form.price);
      fd.append('mrp', form.mrp);
      if (form.discount) fd.append('discount', form.discount);
      if (form.brand) fd.append('brand', form.brand);
      fd.append('stock', form.stock);
      fd.append('category', form.category);
      if (form.subCategory) fd.append('subCategory', form.subCategory);
      fd.append('isActive', form.isActive);

      if (form.highlights.trim()) {
        fd.append('highlights', JSON.stringify(
          form.highlights.split(',').map(s => s.trim()).filter(Boolean)
        ));
      }

      const specs = buildSpecifications(form.specifications);
      if (specs.length > 0) fd.append('specifications', JSON.stringify(specs));

      imageFiles.forEach(f => fd.append('images', f));

      if (editTarget) {
        await updateProduct(editTarget._id, fd);
      } else {
        await createProduct(fd);
      }
      setModalOpen(false);
      fetchProducts(page, search);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deleteTarget._id);
      setDeleteTarget(null);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteTarget._id); return n; });
      fetchProducts(page, search);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      await deleteMultipleProducts(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      fetchProducts(page, search);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map(p => p._id)));
  };

  const filteredSubs = subCategories.filter(
    (s) => !form.category || (typeof s.category === 'object' ? s.category._id : s.category) === form.category
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchProducts(1, search); } }}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setPage(1); fetchProducts(1, search); }} variant="secondary">Search</Button>
        {selectedIds.size > 0 && (
          <Button variant="danger" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete ({selectedIds.size})
          </Button>
        )}
        <Button variant="secondary" onClick={() => setBulkModalOpen(true)}>
          <Upload className="h-4 w-4" /> Bulk Upload
        </Button>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : products.length === 0 ? (
          <EmptyState message="No products found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Price / MRP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p._id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(p._id) ? 'bg-indigo-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p._id)}
                          onChange={() => toggleSelect(p._id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            <Image src={p.images[0].url} alt={p.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                              <Package className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-800">{p.name}</p>
                            {p.brand && <p className="text-xs text-slate-400">{p.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {typeof p.category === 'object' ? p.category.name : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800">₹{p.price.toLocaleString()}</p>
                        {p.mrp > p.price && (
                          <p className="text-xs text-slate-400 line-through">₹{p.mrp.toLocaleString()}</p>
                        )}
                        {p.discount > 0 && (
                          <span className="text-xs text-emerald-600 font-medium">{p.discount}% off</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          label={`${p.stock} units`}
                          variant={p.stock === 0 ? 'danger' : p.stock < 10 ? 'warning' : 'success'}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <Badge label={p.isActive ? 'Active' : 'Inactive'} variant={p.isActive ? 'success' : 'danger'} />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Product' : 'Add Product'} size="lg">
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required className="col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
            </FormField>
            <FormField label="Description" required className="col-span-2">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description" />
            </FormField>

            <FormField label="Selling Price (₹)" required>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" min="0" />
            </FormField>
            <FormField label="MRP (₹)" required>
              <Input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} placeholder="0" min="0" />
            </FormField>

            <FormField label="Discount % (auto-calculated if blank)">
              <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="Auto" min="0" max="100" />
            </FormField>
            <FormField label="Brand">
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Apple, Samsung" />
            </FormField>

            <FormField label="Stock" required>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" min="0" />
            </FormField>
            <FormField label="Status">
              <Select value={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.value })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </FormField>

            <FormField label="Category" required>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: '' })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Sub Category">
              <Select value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })}>
                <option value="">None</option>
                {filteredSubs.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Highlights (comma-separated)" className="col-span-2">
              <Input value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} placeholder="6GB RAM, 5000mAh battery, 64MP camera" />
            </FormField>

            <FormField label="Specifications (one per line: Key:Value)" className="col-span-2">
              <Textarea
                rows={4}
                value={form.specifications}
                onChange={(e) => setForm({ ...form, specifications: e.target.value })}
                placeholder={"Color:Black\nWeight:200g\nWarranty:1 year"}
              />
            </FormField>

            {/* Images */}
            <FormField label="Images" className="col-span-2">
              <div className="space-y-3">
                {/* Existing images (edit mode) */}
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {imagePreviews.map((img, i) => (
                      <div key={i} className="relative group">
                        <Image
                          src={img.src}
                          alt={`img-${i}`}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => img.isExisting && img.public_id
                            ? handleRemoveExistingImage(img.public_id)
                            : handleRemoveNewImage(i)
                          }
                          className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {/* Replace all images */}
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" /> {editTarget ? 'Replace All Images' : 'Upload Images'}
                  </Button>

                  {/* Add more images (edit mode only) */}
                  {editTarget && (
                    <>
                      <input ref={addImagesRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddMoreImages} />
                      <Button type="button" variant="secondary" onClick={() => addImagesRef.current?.click()}>
                        <ImagePlus className="h-4 w-4" /> Add More Images
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-400">Max 10 images · 5MB each · Hover image to remove</p>
              </div>
            </FormField>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">{editTarget ? 'Save Changes' : 'Create Product'}</Button>
        </div>
      </Modal>

      {/* Single Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkDeleteLoading}
        title="Delete Selected Products"
        message={`Are you sure you want to delete ${selectedIds.size} selected product(s)? This cannot be undone.`}
      />

      {/* Bulk Upload */}
      <BulkUploadModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Upload Products"
        csvHint="name, description, price, mrp, stock, categoryName, subCategoryName (opt), brand (opt), discount (opt), isActive (opt), highlights (opt), specifications (opt)"
        csvExample={`name,description,price,mrp,stock,categoryName,subCategoryName,brand,discount,isActive,highlights,specifications
iPhone 15,Apple smartphone,79999,89999,50,Electronics,Phones,Apple,,true,6GB RAM|128GB Storage|5G Support,Color:Black|Storage:128GB|Warranty:1 year
Plain T-Shirt,Cotton t-shirt,499,999,200,Clothing,,,,true,100% Cotton|Machine Washable,`}
        sampleFile="/csv-samples/products.csv"
        onUpload={async (file) => {
          const res = await bulkUploadProducts(file);
          return res.data.data;
        }}
        onSuccess={() => fetchProducts(1, '')}
      />
    </div>
  );
}
