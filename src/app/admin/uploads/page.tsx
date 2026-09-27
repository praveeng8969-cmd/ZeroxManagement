'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UploadSection } from '@/types';
import { DataStore } from '@/lib/data-store';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import {
  FolderPlus,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Lock,
  Unlock,
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function AdminUploadsPage() {
  const [sections, setSections] = useState<UploadSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await DataStore.getSections();
      setSections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('printtrack_sections_updated', loadData);
    return () => window.removeEventListener('printtrack_sections_updated', loadData);
  }, []);

  const handleToggleStatus = async (sec: UploadSection) => {
    const nextStatus = sec.status === 'open' ? 'closed' : 'open';
    await DataStore.updateSection(sec.id, { status: nextStatus });
    loadData();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await DataStore.deleteSection(deleteId);
    setDeleteId(null);
    loadData();
  };

  const filtered = sections.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Upload Sections</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, configure, and manage dynamic upload sections for assignments and reports.
          </p>
        </div>

        <Link
          href="/admin/uploads/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Upload Section</span>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sections by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {filtered.length} of {sections.length} sections
        </span>
      </div>

      {/* Sections Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title & Slug</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pricing</th>
                  <th className="py-3 px-4">Submissions</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Allowed Formats</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sec) => (
                  <tr key={sec.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Title */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/uploads/${sec.id}`}
                        className="font-bold text-slate-900 hover:text-sky-600 text-sm block"
                      >
                        {sec.title}
                      </Link>
                      <span className="text-[11px] font-mono text-slate-400">/{sec.slug}</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={sec.status} size="sm" />
                    </td>

                    {/* Pricing */}
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">
                      {formatCurrency(sec.xerox_rate)}/page + {formatCurrency(sec.extra_charge)}
                    </td>

                    {/* Submissions count */}
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      <Link
                        href={`/admin/uploads/${sec.id}`}
                        className="inline-flex items-center gap-1.5 hover:text-sky-600 font-semibold"
                      >
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>{sec.submissions_count ?? 0}</span>
                      </Link>
                    </td>

                    {/* Deadline */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {formatDateShort(sec.deadline)}
                    </td>

                    {/* Formats */}
                    <td className="py-3.5 px-4 uppercase text-slate-500 font-mono text-[10px]">
                      {sec.allowed_file_types?.join(', ') || 'PDF'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle Status */}
                        <button
                          onClick={() => handleToggleStatus(sec)}
                          className={`rounded p-1.5 transition-colors ${
                            sec.status === 'open'
                              ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={sec.status === 'open' ? 'Close Section' : 'Open Section'}
                        >
                          {sec.status === 'open' ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* View Section */}
                        <Link
                          href={`/admin/uploads/${sec.id}`}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-sky-600 transition-colors"
                          title="Manage Submissions"
                        >
                          <Users className="h-3.5 w-3.5" />
                        </Link>

                        {/* Edit Section */}
                        <Link
                          href={`/admin/uploads/${sec.id}/edit`}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Edit Section"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>

                        {/* Delete Section */}
                        <button
                          onClick={() => setDeleteId(sec.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <FolderPlus className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No upload sections found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Create your first upload section to start collecting student files.
            </p>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete Upload Section?"
        variant="danger"
        description="Are you sure you want to delete this upload section? All associated submissions and student file records will be permanently removed."
      >
        <div className="flex justify-end gap-2.5 pt-4">
          <button
            onClick={() => setDeleteId(null)}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-2xs"
          >
            Delete Section
          </button>
        </div>
      </Modal>
    </div>
  );
}
