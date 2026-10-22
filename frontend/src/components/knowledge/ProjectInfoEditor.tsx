'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Project } from '@/types';
import { Button } from '@/components/ui/Button';
import { Save, Edit3, X, Check, Calendar, Server, Users, Target, Shield, Link2, FileText } from 'lucide-react';

interface ProjectInfoEditorProps {
  project: Project;
  onProjectUpdate: (updated: Project) => void;
  canEdit: boolean;
}

export function ProjectInfoEditor({
  project,
  onProjectUpdate,
  canEdit,
}: ProjectInfoEditorProps) {
  const { fetchWithAuth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [goals, setGoals] = useState(project.goals || '');
  const [targetUsers, setTargetUsers] = useState(project.targetUsers || '');
  const [techStack, setTechStack] = useState(project.techStack || '');
  const [businessRequirements, setBusinessRequirements] = useState(project.businessRequirements || '');
  const [technicalConstraints, setTechnicalConstraints] = useState(project.technicalConstraints || '');
  const [knownDependencies, setKnownDependencies] = useState(project.knownDependencies || '');
  const [targetReleaseDate, setTargetReleaseDate] = useState(project.targetReleaseDate || '');
  const [additionalNotes, setAdditionalNotes] = useState(project.additionalNotes || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error('Project name and short description are required.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetchWithAuth(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          goals: goals.trim() || null,
          targetUsers: targetUsers.trim() || null,
          techStack: techStack.trim() || null,
          businessRequirements: businessRequirements.trim() || null,
          technicalConstraints: technicalConstraints.trim() || null,
          knownDependencies: knownDependencies.trim() || null,
          targetReleaseDate: targetReleaseDate.trim() || null,
          additionalNotes: additionalNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update project information');
      }

      toast.success('Project information updated successfully.');
      onProjectUpdate(data.project);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Error saving project info');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(project.name);
    setDescription(project.description || '');
    setGoals(project.goals || '');
    setTargetUsers(project.targetUsers || '');
    setTechStack(project.techStack || '');
    setBusinessRequirements(project.businessRequirements || '');
    setTechnicalConstraints(project.technicalConstraints || '');
    setKnownDependencies(project.knownDependencies || '');
    setTargetReleaseDate(project.targetReleaseDate || '');
    setAdditionalNotes(project.additionalNotes || '');
    setIsEditing(false);
  };

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#2A2A2A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-white" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Project Specification & Metadata
          </h3>
        </div>

        {canEdit && !isEditing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-[11px] h-7 px-2.5"
          >
            <Edit3 className="h-3 w-3 mr-1.5" />
            Edit Info
          </Button>
        )}
      </div>

      {/* Body */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Target Release Date
              </label>
              <input
                type="text"
                placeholder="e.g. Q4 2026 or 2026-12-15"
                value={targetReleaseDate}
                onChange={(e) => setTargetReleaseDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
              Short Description *
            </label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Goals & Objectives
              </label>
              <textarea
                rows={3}
                placeholder="Key goals, success metrics, and milestones..."
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Target Users & Personas
              </label>
              <textarea
                rows={3}
                placeholder="End users, administrators, roles, customer segments..."
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Technology Stack
              </label>
              <textarea
                rows={3}
                placeholder="Frameworks, languages, databases, hosting, services..."
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Technical Constraints
              </label>
              <textarea
                rows={3}
                placeholder="Latency limits, compliance, security, SLA guarantees..."
                value={technicalConstraints}
                onChange={(e) => setTechnicalConstraints(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Business Requirements
              </label>
              <textarea
                rows={3}
                placeholder="Domain rules, workflows, business expectations..."
                value={businessRequirements}
                onChange={(e) => setBusinessRequirements(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Known Dependencies & Integrations
              </label>
              <textarea
                rows={3}
                placeholder="External APIs, vendor dependencies, identity providers..."
                value={knownDependencies}
                onChange={(e) => setKnownDependencies(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
              Additional Notes
            </label>
            <textarea
              rows={2}
              placeholder="Any other context relevant for development..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A2A2A]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save Information'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-6 space-y-6">
          {/* Main Description */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-neutral-500 font-mono mb-1">
              Description
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {project.description || 'No description provided.'}
            </p>
          </div>

          {/* Grid of Key Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2 border-t border-[#2A2A2A]">
            <div>
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold mb-1">
                <Target className="h-3.5 w-3.5 text-white" />
                <span>Goals & Objectives</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {project.goals || <span className="text-neutral-600 italic">Not set</span>}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold mb-1">
                <Users className="h-3.5 w-3.5 text-white" />
                <span>Target Users</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {project.targetUsers || <span className="text-neutral-600 italic">Not set</span>}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold mb-1">
                <Calendar className="h-3.5 w-3.5 text-white" />
                <span>Target Release</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {project.targetReleaseDate || <span className="text-neutral-600 italic">Not set</span>}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold mb-1">
                <Server className="h-3.5 w-3.5 text-white" />
                <span>Technology Stack</span>
              </div>
              <p className="text-xs font-mono text-neutral-300 leading-relaxed bg-[#141414] p-2 rounded-lg border border-[#2A2A2A]">
                {project.techStack || <span className="text-neutral-600 italic font-sans">Not set</span>}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold mb-1">
                <Shield className="h-3.5 w-3.5 text-white" />
                <span>Constraints</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {project.technicalConstraints || <span className="text-neutral-600 italic">Not set</span>}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold mb-1">
                <Link2 className="h-3.5 w-3.5 text-white" />
                <span>Dependencies</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {project.knownDependencies || <span className="text-neutral-600 italic">Not set</span>}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
