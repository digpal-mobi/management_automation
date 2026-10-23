'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Project } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  Edit3,
  Calendar,
  Server,
  Users,
  Target,
  Shield,
  Link2,
  FileText,
  Info,
} from 'lucide-react';

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
  const [businessRequirements, setBusinessRequirements] = useState(
    project.businessRequirements || ''
  );
  const [technicalConstraints, setTechnicalConstraints] = useState(
    project.technicalConstraints || ''
  );
  const [knownDependencies, setKnownDependencies] = useState(
    project.knownDependencies || ''
  );
  const [targetReleaseDate, setTargetReleaseDate] = useState(
    project.targetReleaseDate || ''
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    project.additionalNotes || ''
  );

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
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle>
            <FileText className="h-4 w-4 text-[#003049]" />
            <span>Project Specification & Metadata</span>
          </CardTitle>

          {canEdit && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              leftIcon={<Edit3 className="h-3.5 w-3.5" />}
            >
              Edit Info
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Body */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Project Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Target Release Date"
              placeholder="e.g. Q4 2026 or 2026-12-15"
              value={targetReleaseDate}
              onChange={(e) => setTargetReleaseDate(e.target.value)}
            />
          </div>

          <Textarea
            label="Short Description *"
            rows={2}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief project summary..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Target Personas & Users"
              value={targetUsers}
              onChange={(e) => setTargetUsers(e.target.value)}
              placeholder="e.g. Frontend Engineers, DevSecOps"
            />

            <Input
              label="Technology Stack"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="e.g. React, Next.js, FastAPI, PostgreSQL"
            />
          </div>

          <Textarea
            label="Goals & Success Criteria"
            rows={3}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="Primary milestones and technical goals..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
              label="Technical Constraints & Compliance"
              rows={3}
              value={technicalConstraints}
              onChange={(e) => setTechnicalConstraints(e.target.value)}
              placeholder="e.g. SOC2, Zero-Trust network latency requirements..."
            />

            <Textarea
              label="Business Requirements & SLAs"
              rows={3}
              value={businessRequirements}
              onChange={(e) => setBusinessRequirements(e.target.value)}
              placeholder="Core commercial or operating deliverables..."
            />
          </div>

          <Textarea
            label="Known Dependencies & External APIs"
            rows={2}
            value={knownDependencies}
            onChange={(e) => setKnownDependencies(e.target.value)}
            placeholder="e.g. Stripe, Sendgrid, OAuth 2.0 Identity Server"
          />

          <Textarea
            label="Additional Notes / Architecture Details"
            rows={2}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Other relevant project notes..."
          />

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
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
              isLoading={isSaving}
            >
              Save Specifications
            </Button>
          </div>
        </form>
      ) : (
        <CardContent className="space-y-6">
          {/* Main Description */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-[#526174] font-mono mb-1 font-semibold">
              Description
            </h4>
            <p className="text-xs text-[#17212B] leading-relaxed">
              {project.description || 'No description provided.'}
            </p>
          </div>

          {/* Grid of Key Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Release Date */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#526174]">
                <Calendar className="h-3.5 w-3.5 text-[#003049]" />
                <span>Target Release</span>
              </div>
              <p className="text-xs text-[#17212B] font-semibold">
                {project.targetReleaseDate || 'Not specified'}
              </p>
            </div>

            {/* Target Users */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#526174]">
                <Users className="h-3.5 w-3.5 text-[#003049]" />
                <span>Target Personas</span>
              </div>
              <p className="text-xs text-[#17212B] font-semibold line-clamp-1">
                {project.targetUsers || 'Not specified'}
              </p>
            </div>

            {/* Tech Stack */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-1.5 text-xs text-[#526174]">
                <Server className="h-3.5 w-3.5 text-[#003049]" />
                <span>Tech Stack</span>
              </div>
              <p className="text-xs text-[#17212B] font-semibold line-clamp-1">
                {project.techStack || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Extended Detail Accordion / Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {project.goals && (
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#003049] font-semibold">
                  <Target className="h-3.5 w-3.5 text-[#003049]" />
                  <span>Goals & Objectives</span>
                </div>
                <p className="text-xs text-[#526174] leading-relaxed whitespace-pre-line">
                  {project.goals}
                </p>
              </div>
            )}

            {project.technicalConstraints && (
              <div className="p-4 rounded-xl bg-[#FDF0D5]/50 border border-[#F7DFAB] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#780000] font-semibold">
                  <Shield className="h-3.5 w-3.5 text-[#780000]" />
                  <span>Technical Constraints</span>
                </div>
                <p className="text-xs text-[#17212B] leading-relaxed whitespace-pre-line">
                  {project.technicalConstraints}
                </p>
              </div>
            )}

            {project.businessRequirements && (
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#003049] font-semibold">
                  <Info className="h-3.5 w-3.5 text-[#003049]" />
                  <span>Business Requirements</span>
                </div>
                <p className="text-xs text-[#526174] leading-relaxed whitespace-pre-line">
                  {project.businessRequirements}
                </p>
              </div>
            )}

            {project.knownDependencies && (
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#003049] font-semibold">
                  <Link2 className="h-3.5 w-3.5 text-[#003049]" />
                  <span>Known Dependencies</span>
                </div>
                <p className="text-xs text-[#526174] leading-relaxed whitespace-pre-line">
                  {project.knownDependencies}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
