'use client';
import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { documentsAPI } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const queryClient = useQueryClient();

  const handleFile = (f: File) => {
    setFile(f);
    setUploaded(false);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    if (subject) fd.append('subject', subject);
    if (tags) fd.append('tags', tags);
    setUploading(true);
    try {
      await documentsAPI.upload(fd);
      toast.success('Document uploaded! Processing in the background.');
      setUploaded(true);
      setFile(null);
      setTitle('');
      setSubject('');
      setTags('');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Upload Document</h1>
        <p className="text-slate-500 mb-8">Upload your study materials to start asking questions and generating quizzes.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
              ${dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300'}
              ${file ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : ''}`}>
            <input id="file-input" type="file" className="hidden" accept=".pdf,.txt,.md,.docx"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-green-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="ml-4 text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="font-medium">Drag & drop or click to upload</p>
                <p className="text-sm text-slate-400 mt-1">PDF, TXT, MD, DOCX — max 10MB</p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Document title <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="input-field" placeholder="" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className="input-field" placeholder="" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Tags (comma separated)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                className="input-field" placeholder="" />
            </div>
          </div>

          <button type="submit" disabled={!file || uploading} className="btn-primary w-full flex items-center justify-center gap-2">
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploaded && <CheckCircle className="w-4 h-4" />}
            {uploading ? 'Uploading...' : uploaded ? 'Uploaded!' : 'Upload Document'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
