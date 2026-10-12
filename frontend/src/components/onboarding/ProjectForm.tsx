'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  Layers,
  ArrowRight,
  FolderKanban,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export function ProjectForm() {
  const router = useRouter();
  const { fetchWithAuth } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prdText, setPrdText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Upload Handler (.md, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPrdText(content);
        if (!name) {
          setName(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const combinedDescription = prdText.trim()
        ? `${description.trim()}\n\nPRD / Spec:\n${prdText.trim()}`
        : description.trim();

      const res = await fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: combinedDescription || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create project');
      }

      toast.success('Project created successfully!');
      router.push(`/projects/${data.project.id}/board`);
    } catch (err: any) {
      console.error('Project creation failed:', err);
      setError(err.message || 'Failed to create project. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" />
          New Project Workspace
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Create Engineering Project
        </h1>
        <p className="text-sm text-slate-400">
          Set up a new workspace with a dedicated Kanban board, ticket tracking, and team collaboration.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Project Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
          {/* Project Name */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fintech Core Ledger or Customer Support Portal"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1.5">
              Description / Summary
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="High-level overview of what this project aims to accomplish..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 custom-scrollbar"
            />
          </div>

          {/* Optional PRD / Spec */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200">
                PRD / Technical Requirements (Optional)
              </label>
              <label className="cursor-pointer text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span>Upload .md or .txt</span>
                <input
                  type="file"
                  accept=".md,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <textarea
              rows={6}
              value={prdText}
              onChange={(e) => setPrdText(e.target.value)}
              placeholder="Paste product specifications, architecture notes, or acceptance requirements here..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 custom-scrollbar"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 font-medium"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                <span>Create Workspace & Board</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
