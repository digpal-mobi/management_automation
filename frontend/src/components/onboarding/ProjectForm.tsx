'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  FolderKanban,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        backLink={{ label: 'Back to Workspaces', href: '/' }}
        icon={<FolderKanban className="h-6 w-6 text-[#003049]" />}
        title="Create New Project"
        description="Initialize your project workspace. In the next step, upload technical PRDs or specifications to autonomously extract modules, constraints, and backlog tickets."
      />

      {error && (
        <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#FDE8E8] text-xs text-[#C1121F] flex items-center justify-between">
          <span className="font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="font-semibold text-[#780000] underline text-[11px] ml-3 flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <Input
              label="Project Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Payment Gateway or Developer Analytics"
            />

            <Textarea
              label="Short Description *"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the application's core purpose and scope..."
            />

            {/* Toggle Optional Information */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-[#526174] hover:text-[#003049] font-medium transition-colors"
              >
                {showAdvanced ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {showAdvanced
                    ? 'Hide Optional Specifications'
                    : 'Add Optional Goals & Tech Stack (Can be added later)'}
                </span>
              </button>
            </div>

            {/* Advanced fields */}
            {showAdvanced && (
              <div className="space-y-4 pt-3 border-t border-[#E2E8F0]">
                <Input
                  label="Goals & Objectives"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Key milestones, business objectives, or success criteria..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Target Users & Personas"
                    value={targetUsers}
                    onChange={(e) => setTargetUsers(e.target.value)}
                    placeholder="e.g. Enterprise DevOps, Consumers"
                  />

                  <Input
                    label="Target Release Date"
                    value={targetReleaseDate}
                    onChange={(e) => setTargetReleaseDate(e.target.value)}
                    placeholder="e.g. Q4 2026 or 2026-11-30"
                  />
                </div>

                <Input
                  label="Technology Stack"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="e.g. Next.js, Node.js, PostgreSQL, Docker"
                />

                <Input
                  label="Technical Constraints"
                  value={technicalConstraints}
                  onChange={(e) => setTechnicalConstraints(e.target.value)}
                  placeholder="e.g. Sub-50ms latency, HIPAA compliance"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-1">
          <Link href="/">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={isSubmitting || !name.trim() || !description.trim()}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Create Workspace
          </Button>
        </div>
      </form>
    </div>
  );
}
