'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  FileText, Trash2, MessageSquare, Brain, Search,
  Loader2, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

const statusIcon: any = {
  ready: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  processing: <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
};

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['documents', page, search],
    queryFn: () => documentsAPI.getAll({ page, limit: 8, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsAPI.delete(id),
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const docs = data?.data?.data?.documents || [];
  const total = data?.data?.data?.total || 0;
  const pages = data?.data?.data?.pages || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Documents</h1>
            <p className="text-slate-500 text-sm mt-1">{total} document{total !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/upload" className="btn-primary text-sm">+ Upload</Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input-field pl-9"
              placeholder="Search documents..."
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="btn-secondary">Clear</button>
          )}
        </form>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : docs.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-medium text-slate-500">No documents found</p>
            <Link href="/upload" className="btn-primary mt-4 inline-block text-sm">Upload your first document</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc: any) => (
              <div key={doc._id} className="card flex items-center gap-4 p-4 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      {statusIcon[doc.status]} {doc.status}
                    </span>
                    <span>{doc.subject}</span>
                    {doc.fileSize && <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {doc.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {doc.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.status === 'ready' && (
                    <>
                      <Link href={`/ai-chat?docId=${doc._id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Ask AI">
                        <MessageSquare className="w-4 h-4" />
                      </Link>
                      <Link href={`/quiz?docId=${doc._id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                        title="Generate quiz">
                        <Brain className="w-4 h-4" />
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this document?')) deleteMutation.mutate(doc._id);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary p-2 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
