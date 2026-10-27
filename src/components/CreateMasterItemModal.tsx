import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import type { MasterItem, Category } from '../lib/types';
import { createMasterItem, updateMasterItem, uploadImageBase64 } from '../lib/api';

interface CreateMasterItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: MasterItem) => void;
  editingItem?: MasterItem | null;
}

export const CreateMasterItemModal: React.FC<CreateMasterItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingItem
}) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<Category>('PC ITEMS');
  const [remark, setRemark] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.itemName || '');
      setCategory(editingItem.category || 'PC ITEMS');
      setRemark(editingItem.remark || '');
      setPhotoUrl(editingItem.photoUrl || '');
      setImagePreview(editingItem.photoUrl || '');
    } else {
      setItemName('');
      setCategory('PC ITEMS');
      setRemark('');
      setPhotoUrl('');
      setImagePreview('');
    }
    setErrorMessage(null);
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('File harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Ukuran file foto maksimal 10MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data);
      try {
        const uploadedUrl = await uploadImageBase64(base64Data);
        setPhotoUrl(uploadedUrl);
      } catch (err: any) {
        // Fallback to base64 if server upload endpoint fails
        setPhotoUrl(base64Data);
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca file foto.');
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // double-click prevention

    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setErrorMessage('Nama Barang wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingItem) {
        const res = await updateMasterItem(editingItem.id, {
          itemName: trimmedName,
          category,
          remark: remark.trim() || null,
          photoUrl: photoUrl.trim() || null
        });
        onSuccess(res.data);
      } else {
        const res = await createMasterItem({
          itemName: trimmedName,
          category,
          remark: remark.trim() || null,
          photoUrl: photoUrl.trim() || null
        });
        onSuccess(res.data);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan master item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {editingItem ? 'Edit Master Item' : 'Create Master Item'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {editingItem
                ? 'Perbarui data katalog master barang'
                : 'Daftarkan data master barang baru ke katalog'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Strictly 4 Fields */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Nama Barang (Wajib) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Barang <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Contoh: ACCESS POINT RUIJIE RG-RAP2200"
              required
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* 2. Kategori Barang (Wajib) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Kategori Barang <span className="text-rose-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            >
              <option value="PC ITEMS">PC ITEMS</option>
              <option value="NETWORK ITEMS">NETWORK ITEMS</option>
              <option value="CCTV & TV ITEMS">CCTV & TV ITEMS</option>
            </select>
          </div>

          {/* 3. Remark (Opsional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Remark <span className="text-slate-500 text-[10px] font-normal">(Opsional)</span>
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="Keterangan spesifikasi, lokasi penempatan umum, atau catatan barang..."
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
            />
          </div>

          {/* 4. Foto Barang (Opsional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Foto Barang <span className="text-slate-500 text-[10px] font-normal">(Opsional)</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{imagePreview ? 'Ganti Foto' : 'Pilih Foto Barang'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('');
                      setPhotoUrl('');
                    }}
                    className="block text-[11px] text-rose-400 hover:text-rose-300 mt-1.5 underline"
                  >
                    Hapus foto
                  </button>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Format JPG, PNG, atau WebP. Maks. 10MB.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold tracking-wide shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingItem ? 'Simpan Perubahan' : 'Create Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
