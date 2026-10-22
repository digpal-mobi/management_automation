'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  FolderKanban,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export function ProjectForm() {
  const router = useRouter();
  const { fetchWithAuth } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Optional fields
  const [goals, setGoals] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [techStack, setTechStack] = useState('');
  const [technicalConstraints, setTechnicalConstraints] = useState('');
  const [targetReleaseDate, setTargetReleaseDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError('Project name and short description are required.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const res = await fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          goals: goals.trim() || null,
          targetUsers: targetUsers.trim() || null,
          techStack: techStack.trim() || null,
          technicalConstraints: technicalConstraints.trim() || null,
          targetReleaseDate: targetReleaseDate.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create project');
      }

      toast.success('Project workspace created.');
      router.push(`/projects/${data.project.id}/knowledge`);
    } catch (err: any) {
      console.error('Project creation failed:', err);
      setError(err.message || 'Failed to create project. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#141414] border border-[#2A2A2A] text-[11px] font-mono text-neutral-300">
          <FolderKanban className="h-3 w-3 text-white" />
          <span>New Project Workspace</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Create Project
        </h1>
        <p className="text-xs text-neutral-400">
          Enter basic details to initialize the workspace. You can upload requirements, PRDs, and configure specifications in the next step.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-[#141414] border border-[#404040] text-xs text-neutral-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold text-white underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-4">
          {/* Project Name */}
          <div>
            <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Payment Gateway or Developer Analytics"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
              Short Description *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the application's core purpose and scope..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
            />
          </div>

          {/* Toggle Optional Information */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span>{showAdvanced ? 'Hide Optional Specifications' : 'Add Optional Goals & Tech Stack (Can be added later)'}</span>
            </button>
          </div>

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="space-y-4 pt-3 border-t border-[#2A2A2A]">
              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Goals & Objectives
                </label>
                <input
                  type="text"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Key milestones, business objectives, or success criteria..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Target Users & Personas
                  </label>
                  <input
                    type="text"
                    value={targetUsers}
                    onChange={(e) => setTargetUsers(e.target.value)}
                    placeholder="e.g. Enterprise DevOps, Consumers"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Target Release Date
                  </label>
                  <input
                    type="text"
                    value={targetReleaseDate}
                    onChange={(e) => setTargetReleaseDate(e.target.value)}
                    placeholder="e.g. Q4 2026 or 2026-11-30"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Technology Stack
                </label>
                <input
                  type="text"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="e.g. Next.js, Node.js, PostgreSQL, Docker"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Technical Constraints
                </label>
                <input
                  type="text"
                  value={technicalConstraints}
                  onChange={(e) => setTechnicalConstraints(e.target.value)}
                  placeholder="e.g. Sub-50ms latency, HIPAA compliance"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/"
            className="text-xs text-neutral-400 hover:text-white"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !name.trim() || !description.trim()}
            className="text-xs font-semibold px-5 py-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Creating Workspace...
              </>
            ) : (
              <>
                <span>Create Workspace</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
