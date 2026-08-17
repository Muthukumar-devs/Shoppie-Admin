'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

interface BulkError { row: number; message: string; }
export interface BulkResult { inserted: number; skipped: number; errors: BulkError[]; }

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  csvHint: string;
  csvExample: string;
  sampleFile: string;
  onUpload: (file: File) => Promise<BulkResult>;
  onSuccess: () => void;
}

export default function BulkUploadModal({
  open, onClose, title, csvHint, csvExample, sampleFile, onUpload, onSuccess,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError('');
    onClose();
  };

  const handleFileChange = (f: File) => {
    setFile(f);
    setResult(null);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await onUpload(file);
      setResult(res);
      onSuccess();
    } catch (err: unknown) {
      const axiosMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(axiosMessage ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      <div className="space-y-4">
        {/* CSV format hint */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required CSV columns</p>
            <a
              href={sampleFile}
              download
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="h-3.5 w-3.5" /> Download sample CSV
            </a>
          </div>
          <p className="text-sm text-slate-700 font-mono">{csvHint}</p>
          <details>
            <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-700 select-none mt-1">
              Show example
            </summary>
            <pre className="mt-2 text-xs text-slate-600 bg-white border border-slate-200 rounded p-3 overflow-x-auto whitespace-pre">
              {csvExample}
            </pre>
          </details>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFileChange(f);
          }}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
            <Upload className="h-5 w-5 text-slate-400" />
          </div>
          {file ? (
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
              <FileText className="h-4 w-4" />
              {file.name}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Click to select or drag & drop</p>
              <p className="text-xs text-slate-400 mt-0.5">CSV files only · Max 2 MB · Max 500 rows</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileChange(f);
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-6 bg-slate-50 px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{result.inserted} inserted</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{result.skipped} skipped</span>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-xs">
                    <span className="shrink-0 font-medium text-slate-500">Row {e.row}</span>
                    <span className="text-red-600">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleUpload} loading={uploading} disabled={!file} className="flex-1">
              <Upload className="h-4 w-4" /> Upload CSV
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
