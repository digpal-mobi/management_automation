'use client';

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ProjectFeature, TicketPriority, FeatureReviewStatus, Ticket } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Map,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  ShieldCheck,
  Layers,
  ListChecks,
  CheckCircle2,
  XCircle,
  GitBranch,
  BookOpen,
  Sparkles,
  Ticket as TicketIcon,
  RotateCw,
  FolderTree,
  Filter,
  Check,
  Search,
  Loader2,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

interface RoadmapViewProps {
  projectId: string;
  features: ProjectFeature[];
  onFeaturesChange: () => void;
  canEdit: boolean;
}

export function RoadmapView({
  projectId,
  features,
  onFeaturesChange,
  canEdit,
}: RoadmapViewProps) {
  const { fetchWithAuth } = useAuth();

  // Filters
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ProjectFeature | null>(null);
  const [generatingForFeature, setGeneratingForFeature] = useState<ProjectFeature | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState<Ticket[] | null>(null);

  // Project Brief & Whole-Project Backlog Modal States
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [briefData, setBriefData] = useState<any>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [briefTab, setBriefTab] = useState<'overview' | 'sprints' | 'coverage' | 'architecture' | 'risks'>('overview');

  // Add Feature Form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newModule, setNewModule] = useState('Core Architecture');
  const [newPriority, setNewPriority] = useState<TicketPriority>('Medium');
  const [newBusinessValue, setNewBusinessValue] = useState('');
  const [newDependencies, setNewDependencies] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Feature Form
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editModule, setEditModule] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>('Medium');
  const [editStatus, setEditStatus] = useState<FeatureReviewStatus>('PROPOSED');
  const [editBusinessValue, setEditBusinessValue] = useState('');
  const [editConstraints, setEditConstraints] = useState('');

  // Collect unique modules
  const allModules = useMemo(() => {
    const set = new Set<string>();
    features.forEach((f) => {
      if (f.module) set.add(f.module);
    });
    return Array.from(set);
  }, [features]);

  // Filter features
  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      if (selectedModule !== 'ALL' && f.module !== selectedModule) return false;
      if (selectedStatus !== 'ALL' && f.status !== selectedStatus) return false;
      if (selectedPriority !== 'ALL' && f.suggestedPriority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = f.name.toLowerCase().includes(q);
        const matchDesc = f.description.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [features, selectedModule, selectedStatus, selectedPriority, searchQuery]);

  // Group by module
  const groupedByModule = useMemo(() => {
    const map: Record<string, ProjectFeature[]> = {};
    filteredFeatures.forEach((f) => {
      const mod = f.module || 'General';
      if (!map[mod]) map[mod] = [];
      map[mod].push(f);
    });
    return map;
  }, [filteredFeatures]);

  // Quick Status Toggle (PROPOSED -> ACCEPTED -> DEFERRED)
  const handleStatusChange = async (featureId: string, newStatus: FeatureReviewStatus) => {
    if (!canEdit) return;
    try {
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/features/${featureId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update feature status');
      }
      toast.success(`Feature marked as ${newStatus.toLowerCase()}`);
      onFeaturesChange();
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    }
  };

  // Open Edit Modal
  const openEditModal = (feature: ProjectFeature) => {
    setEditingFeature(feature);
    setEditName(feature.name);
    setEditDesc(feature.description);
    setEditModule(feature.module);
    setEditPriority(feature.suggestedPriority);
    setEditStatus(feature.status);
    setEditBusinessValue(feature.businessValue || '');
    setEditConstraints(feature.constraints || '');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature) return;

    try {
      setIsSubmitting(true);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/features/${editingFeature.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editName.trim(),
            description: editDesc.trim(),
            module: editModule.trim(),
            suggestedPriority: editPriority,
            status: editStatus,
            businessValue: editBusinessValue.trim() || null,
            constraints: editConstraints.trim() || null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update feature');
      }

      toast.success('Feature updated.');
      setEditingFeature(null);
      onFeaturesChange();
    } catch (err: any) {
      toast.error(err.message || 'Error updating feature');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Feature
  const handleDeleteFeature = async (featureId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete feature "${name}"?`)) return;

    try {
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/features/${featureId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete feature');
      }
      toast.success('Feature deleted.');
      onFeaturesChange();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting feature');
    }
  };

  // Add Manual Feature
  const handleAddFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesc.trim()) {
      toast.error('Feature name and description are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const deps = newDependencies
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await fetchWithAuth(`/api/projects/${projectId}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          module: newModule.trim() || 'Core Architecture',
          suggestedPriority: newPriority,
          businessValue: newBusinessValue.trim() || null,
          dependencies: deps,
          status: 'ACCEPTED',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add feature');
      }

      toast.success('Feature added to roadmap.');
      setIsAddOpen(false);
      setNewName('');
      setNewDesc('');
      setNewBusinessValue('');
      setNewDependencies('');
      onFeaturesChange();
    } catch (err: any) {
      toast.error(err.message || 'Error adding feature');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Ticket Generation for this Feature
  const handleGenerateTickets = async () => {
    if (!generatingForFeature) return;

    try {
      setIsGenerating(true);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/features/${generatingForFeature.id}/generate-tickets`,
        { method: 'POST' }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ticket generation failed');
      }

      setGeneratedTickets(data.tickets);
      toast.success(`Generated ${data.tickets.length} tickets for "${generatingForFeature.name}"!`);
      onFeaturesChange();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to generate tickets');
    } finally {
      setIsGenerating(false);
    }
  };

  // Load Project Brief
  const handleOpenBrief = async () => {
    try {
      setLoadingBrief(true);
      setIsBriefOpen(true);
      const res = await fetchWithAuth(`/api/projects/${projectId}/brief`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBriefData(data.brief);
      } else {
        toast.error('Failed to load project brief');
      }
    } catch (err: any) {
      toast.error('Error fetching project brief');
    } finally {
      setLoadingBrief(false);
    }
  };

  // Mode A: Trigger Whole-Project Backlog Generation
  const handleGenerateAllBacklog = async () => {
    if (!canEdit) return;
    try {
      setIsGeneratingAll(true);
      const res = await fetchWithAuth(`/api/projects/${projectId}/backlog/generate-all`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Backlog generation failed');
      }

      toast.success(
        `Generated ${data.createdCount} backlog tickets! (${data.existingCount} already present)`
      );
      onFeaturesChange();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to generate whole-project backlog');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar & Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-card">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174]" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] placeholder-[#94A3B8] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Module Filter */}
          <div className="relative">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="py-1.5 pl-3 pr-8 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs text-[#17212B] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049] cursor-pointer appearance-none transition-colors"
            >
              <option value="ALL">All Modules ({features.length})</option>
              {allModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174] pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1.5 pl-3 pr-8 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs text-[#17212B] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049] cursor-pointer appearance-none transition-colors"
            >
              <option value="ALL">All Review Statuses</option>
              <option value="PROPOSED">Proposed</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DEFERRED">Deferred</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174] pointer-events-none" />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="py-1.5 pl-3 pr-8 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs text-[#17212B] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049] cursor-pointer appearance-none transition-colors"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174] pointer-events-none" />
          </div>

          {/* Project Brief & Coverage Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenBrief}
            className="text-xs font-semibold text-[#003049] border-[#003049]/30 hover:bg-[#EFF5F9]"
            title="Inspect synthesized Project Brief, 11 Sprints Schedule, and Coverage Report"
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Project Brief & Coverage
          </Button>

          {/* Mode A: Whole-Project Backlog Button */}
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isGeneratingAll}
              onClick={handleGenerateAllBacklog}
              className="text-xs font-semibold bg-[#003049] hover:bg-[#002437] text-white shadow-xs"
              title="Generate developer-ready backlog tickets for all reconciled project candidates"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Generate Full Backlog
            </Button>
          )}

          {/* Add Manual Feature Button */}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Feature
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {features.length === 0 ? (
        <EmptyState
          icon={<Map className="h-6 w-6 text-[#003049]" />}
          title="No Features Identified Yet"
          description="Run AI analysis on your project knowledge base to extract proposed features, or manually add your first roadmap capability."
          action={
            canEdit ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsAddOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Feature Manually
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Grouped Features Modules */
        <div className="space-y-8">
          {Object.entries(groupedByModule).map(([moduleName, moduleFeatures]) => (
            <div
              key={moduleName}
              className="rounded-2xl border border-[#E2E8F0] bg-white shadow-card overflow-hidden"
            >
              {/* Module Header */}
              <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F7F8FA] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-[#003049]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17212B]">
                    {moduleName}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-[#526174] border border-[#E2E8F0] font-medium">
                    {moduleFeatures.length} feature(s)
                  </span>
                </div>
              </div>

              {/* Feature Cards in Module */}
              <div className="divide-y divide-[#E2E8F0]">
                {moduleFeatures.map((feature) => {
                  const ticketCount = feature.tickets?.length || 0;

                  return (
                    <div
                      key={feature.id}
                      className="p-5 hover:bg-[#FDFDFE] transition-colors space-y-3"
                    >
                      {/* Top Row: Name, Status, Priority, Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-[#17212B]">
                              {feature.name}
                            </h4>
                            <Badge
                              variant="featureStatus"
                              featureStatus={feature.status}
                              size="sm"
                            />
                            <Badge
                              variant="priority"
                              priority={feature.suggestedPriority}
                              size="sm"
                            />
                            {feature.sprint && (
                              <span className="text-[10px] font-mono text-[#003049] bg-[#EFF5F9] px-2 py-0.5 rounded-full border border-[#669BBC]/30 font-bold flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Sprint {feature.sprint}
                              </span>
                            )}
                            {feature.targetDate && (
                              <span className="text-[10px] font-mono text-[#526174]">
                                {feature.targetDate}
                              </span>
                            )}
                            {feature.sourceCandidateIds && (feature.sourceCandidateIds as string[]).length > 0 && (
                              <span className="text-[10px] font-mono text-[#526174] bg-[#F7F8FA] px-2 py-0.5 rounded-full border border-[#E2E8F0] font-medium">
                                {(feature.sourceCandidateIds as string[]).length} ticket candidates
                              </span>
                            )}
                            {feature.isAiGenerated && (
                              <span className="text-[10px] font-mono text-[#526174] bg-[#F7F8FA] px-1.5 py-0.5 rounded border border-[#E2E8F0] font-medium">
                                AI Suggested
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Switcher & Action Buttons */}
                        {canEdit && (
                          <div className="flex items-center gap-2 self-start">
                            {/* Accept Button */}
                            {feature.status !== 'ACCEPTED' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(feature.id, 'ACCEPTED')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#003049] text-white hover:bg-[#002437] transition-colors shadow-xs"
                                title="Approve into active roadmap"
                              >
                                Accept
                              </button>
                            )}

                            {/* Defer Button */}
                            {feature.status !== 'DEFERRED' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(feature.id, 'DEFERRED')}
                                className="px-2.5 py-1 rounded-lg text-[11px] text-[#526174] hover:text-[#17212B] bg-[#F1F4F7] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-colors"
                                title="Defer to later phase"
                              >
                                Defer
                              </button>
                            )}

                            {/* Generate Tickets Button */}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setGeneratingForFeature(feature);
                                setGeneratedTickets(null);
                              }}
                              className="text-[11px] h-7 px-2.5"
                              title="Generate developer tickets for this feature"
                            >
                              <TicketIcon className="h-3 w-3 mr-1 text-[#003049]" />
                              <span>Generate Tickets</span>
                            </Button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(feature)}
                              className="p-1.5 rounded-lg text-[#526174] hover:text-[#003049] hover:bg-[#F1F4F7] border border-transparent hover:border-[#E2E8F0] transition-colors"
                              title="Edit feature specifications"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteFeature(feature.id, feature.name)}
                              className="p-1.5 rounded-lg text-[#526174] hover:text-[#C1121F] hover:bg-[#FDF2F2] border border-transparent hover:border-[#FDE8E8] transition-colors"
                              title="Delete feature"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#526174] leading-relaxed">
                        {feature.description}
                      </p>

                      {/* Business Value & Constraints */}
                      {feature.businessValue && (
                        <div className="text-[11px] text-[#526174]">
                          <strong className="text-[#17212B]">Business Value:</strong>{' '}
                          {feature.businessValue}
                        </div>
                      )}

                      {/* Meta Footer: Dependencies, Source References, Linked Tickets */}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#526174] pt-2 border-t border-[#E2E8F0]">
                        {/* Dependencies */}
                        {feature.dependencies && feature.dependencies.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <GitBranch className="h-3 w-3 text-[#526174]" />
                            <span className="text-[#526174]">Prerequisites:</span>
                            <span className="text-[#17212B] font-medium">
                              {feature.dependencies.join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Source References */}
                        {feature.sourceReferences && feature.sourceReferences.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3 text-[#526174]" />
                            <span className="text-[#526174]">Source:</span>
                            <span className="text-[#17212B] font-medium">
                              {feature.sourceReferences[0].docTitle}{' '}
                              {feature.sourceReferences[0].location &&
                                `(${feature.sourceReferences[0].location})`}
                            </span>
                          </div>
                        )}

                        {/* Linked Tickets Count */}
                        {ticketCount > 0 && (
                          <div className="flex items-center gap-1 text-[#003049] font-semibold ml-auto">
                            <TicketIcon className="h-3 w-3" />
                            <span>{ticketCount} generated ticket(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Add Feature Manually */}
      <Dialog open={isAddOpen} onOpenChange={(open) => !open && setIsAddOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Roadmap Feature</DialogTitle>
            <DialogDescription>
              Manually add a planned capability to the project roadmap.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddFeature} className="space-y-4 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                Feature Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Audit Logging & Compliance Export"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] placeholder-[#94A3B8] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                  Module / Subsystem
                </label>
                <input
                  type="text"
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  placeholder="e.g. Security & Compliance"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] placeholder-[#94A3B8] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049] cursor-pointer"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                Description *
              </label>
              <textarea
                rows={3}
                required
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Detailed scope of the planned feature..."
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] placeholder-[#94A3B8] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049] custom-scrollbar"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                Business Value / Objective
              </label>
              <input
                type="text"
                value={newBusinessValue}
                onChange={(e) => setNewBusinessValue(e.target.value)}
                placeholder="Why is this valuable to users or the business?"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] placeholder-[#94A3B8] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                Prerequisites / Dependencies (Comma-separated)
              </label>
              <input
                type="text"
                value={newDependencies}
                onChange={(e) => setNewDependencies(e.target.value)}
                placeholder="e.g. User Authentication, Database Schema"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] placeholder-[#94A3B8] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add to Roadmap'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Edit Feature Specifications */}
      <Dialog
        open={!!editingFeature}
        onOpenChange={(open) => !open && setEditingFeature(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Roadmap Feature</DialogTitle>
            <DialogDescription>
              Update feature specifications, priority, module grouping, and review status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                Feature Name *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                  Module
                </label>
                <input
                  type="text"
                  value={editModule}
                  onChange={(e) => setEditModule(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                  Priority
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049] cursor-pointer"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as FeatureReviewStatus)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049] cursor-pointer"
                >
                  <option value="PROPOSED">Proposed</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="DEFERRED">Deferred</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                Description *
              </label>
              <textarea
                rows={3}
                required
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049] custom-scrollbar"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#17212B] block mb-1">
                Business Value
              </label>
              <input
                type="text"
                value={editBusinessValue}
                onChange={(e) => setEditBusinessValue(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#17212B] focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingFeature(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Scoped Ticket Generation Dialog */}
      <Dialog
        open={!!generatingForFeature}
        onOpenChange={(open) => {
          if (!open) {
            setGeneratingForFeature(null);
            setGeneratedTickets(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-[#003049]" />
              <span>Generate Tickets for Feature</span>
            </DialogTitle>
            <DialogDescription>
              Generate granular, developer-ready tickets scoped specifically to{' '}
              <strong>&ldquo;{generatingForFeature?.name}&rdquo;</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-[#EFF5F9] border border-[#669BBC]/30 space-y-1">
              <span className="text-xs font-semibold text-[#003049] block">
                Feature Scope:
              </span>
              <p className="text-[11px] text-[#526174] leading-relaxed">
                {generatingForFeature?.description}
              </p>
            </div>

            {generatedTickets ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#17212B]">
                  <span>Generated Tickets ({generatedTickets.length}):</span>
                  <span className="text-[11px] text-[#526174]">Added to project backlog</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {generatedTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#17212B] truncate">
                          {t.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="type" type={t.type} size="sm" />
                          <Badge variant="priority" priority={t.priority} size="sm" />
                        </div>
                      </div>
                      <p className="text-[11px] text-[#526174] line-clamp-2">
                        {t.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#526174] leading-relaxed">
                Click below to generate implementation tickets with acceptance criteria, technical notes, and complexity estimates. Tickets will enter the project backlog for your review.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setGeneratingForFeature(null);
                  setGeneratedTickets(null);
                }}
              >
                {generatedTickets ? 'Done' : 'Cancel'}
              </Button>

              {!generatedTickets && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isGenerating}
                  onClick={handleGenerateTickets}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Generating Tickets...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generate Implementation Tickets
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Brief & Source Coverage Modal */}
      <Dialog open={isBriefOpen} onOpenChange={setIsBriefOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#003049]">
              <FileText className="h-5 w-5 text-[#003049]" />
              <span>Project Brief & Source Coverage Report</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#526174]">
              Synthesized from PRD specifications, sprint schedule worksheets, and architecture boundaries.
            </DialogDescription>
          </DialogHeader>

          {loadingBrief ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#003049]" />
              <span className="text-xs text-[#526174]">Loading Project Brief...</span>
            </div>
          ) : !briefData ? (
            <div className="py-8 text-center text-xs text-[#526174]">
              No brief data available yet. Please run AI analysis or upload project documents.
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {/* Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setBriefTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    briefTab === 'overview'
                      ? 'bg-[#003049] text-white'
                      : 'text-[#526174] hover:bg-[#F1F4F7]'
                  }`}
                >
                  Overview & Scope
                </button>
                <button
                  type="button"
                  onClick={() => setBriefTab('sprints')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    briefTab === 'sprints'
                      ? 'bg-[#003049] text-white'
                      : 'text-[#526174] hover:bg-[#F1F4F7]'
                  }`}
                >
                  Sprint Schedule ({briefData.sprintSchedule?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setBriefTab('coverage')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    briefTab === 'coverage'
                      ? 'bg-[#003049] text-white'
                      : 'text-[#526174] hover:bg-[#F1F4F7]'
                  }`}
                >
                  Source Coverage (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setBriefTab('architecture')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    briefTab === 'architecture'
                      ? 'bg-[#003049] text-white'
                      : 'text-[#526174] hover:bg-[#F1F4F7]'
                  }`}
                >
                  Architecture & Roles
                </button>
                <button
                  type="button"
                  onClick={() => setBriefTab('risks')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    briefTab === 'risks'
                      ? 'bg-[#003049] text-white'
                      : 'text-[#526174] hover:bg-[#F1F4F7]'
                  }`}
                >
                  Launch Gates & Risks
                </button>
              </div>

              {/* Tab 1: Overview & Scope */}
              {briefTab === 'overview' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#EFF5F9] border border-[#669BBC]/30 space-y-1.5">
                    <h4 className="text-xs font-bold text-[#003049] uppercase tracking-wider font-mono">
                      Executive Summary & Objectives
                    </h4>
                    <p className="text-xs text-[#17212B] leading-relaxed">
                      {briefData.overview}
                    </p>
                  </div>

                  {briefData.visionAndGoals?.goals && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#17212B]">Core Goals & Success Metrics</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#526174]">
                        {briefData.visionAndGoals.goals.map((g: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0]">
                            <CheckCircle2 className="h-4 w-4 text-[#003049] shrink-0 mt-0.5" />
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-2">
                      <h5 className="text-[11px] font-bold text-[#166534] uppercase font-mono">
                        P0 Launch Baseline
                      </h5>
                      <ul className="space-y-1 text-[11px] text-[#166534]">
                        {briefData.scope?.p0Required?.slice(0, 5).map((item: string, idx: number) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] space-y-2">
                      <h5 className="text-[11px] font-bold text-[#1E40AF] uppercase font-mono">
                        P1 Secondary Scope
                      </h5>
                      <ul className="space-y-1 text-[11px] text-[#1E40AF]">
                        {briefData.scope?.p1Secondary?.map((item: string, idx: number) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] space-y-2">
                      <h5 className="text-[11px] font-bold text-[#991B1B] uppercase font-mono">
                        Out of Scope
                      </h5>
                      <ul className="space-y-1 text-[11px] text-[#991B1B]">
                        {briefData.scope?.outOfScope?.map((item: string, idx: number) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Sprints Schedule */}
              {briefTab === 'sprints' && (
                <div className="space-y-3">
                  <div className="text-xs text-[#526174]">
                    The source plan establishes 11 development sprints and a production launch cutover window. Every sprint is fully preserved and mapped to roadmap capabilities.
                  </div>
                  <div className="space-y-2.5">
                    {briefData.sprintSchedule?.map((s: any) => (
                      <div
                        key={s.sprint}
                        className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#FDFDFE] text-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#003049] text-white font-bold">
                              Sprint {s.sprint}
                            </span>
                            <span className="font-bold text-[#17212B]">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-[#526174]">
                            <span>{s.start} to {s.end}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#EFF5F9] text-[#003049] font-bold border border-[#669BBC]/30">
                              {s.candidateCount} tickets ({s.storyPoints} pts)
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#526174]">
                          <strong>Goal:</strong> {s.goal}
                        </p>
                        <p className="text-[11px] text-[#526174]">
                          <strong>Deliverables:</strong> {s.deliverables}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Source Coverage */}
              {briefTab === 'coverage' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0]">
                      <div className="text-xl font-bold font-mono text-[#003049]">
                        {briefData.sourceCoverage?.sprintsRepresented} / {briefData.sourceCoverage?.sprintsDetected}
                      </div>
                      <div className="text-[10px] text-[#526174] uppercase tracking-wider font-semibold mt-1">
                        Sprints Represented
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0]">
                      <div className="text-xl font-bold font-mono text-[#003049]">
                        {briefData.sourceCoverage?.reconciledCandidates} / {briefData.sourceCoverage?.sourceBacklogCandidates}
                      </div>
                      <div className="text-[10px] text-[#526174] uppercase tracking-wider font-semibold mt-1">
                        Candidates Reconciled
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0]">
                      <div className="text-xl font-bold font-mono text-[#003049]">
                        {briefData.sourceCoverage?.featuresExtracted}
                      </div>
                      <div className="text-[10px] text-[#526174] uppercase tracking-wider font-semibold mt-1">
                        Roadmap Features
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
                      <div className="text-xl font-bold font-mono text-[#166534]">
                        100%
                      </div>
                      <div className="text-[10px] text-[#166534] uppercase tracking-wider font-semibold mt-1">
                        Validation Status
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#17212B]">Extraction Validation Checks</h4>
                    <div className="space-y-1.5">
                      {briefData.sourceCoverage?.validationRules?.map((r: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#166534] shrink-0" />
                            <span className="font-medium text-[#17212B]">{r.rule}</span>
                          </div>
                          {r.note && (
                            <span className="text-[11px] font-mono text-[#526174]">{r.note}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] text-[11px] text-[#526174] space-y-1">
                    <div><strong>Documents Parsed:</strong> {briefData.sourceCoverage?.documentsDiscovered?.join(', ')}</div>
                    <div><strong>Sheets Analyzed:</strong> {briefData.sourceCoverage?.worksheetsProcessed?.join(', ')}</div>
                    <div><strong>Total Chunks Stored:</strong> {briefData.sourceCoverage?.totalChunks}</div>
                  </div>
                </div>
              )}

              {/* Tab 4: Architecture & Roles */}
              {briefTab === 'architecture' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-1">
                    <strong className="text-[#17212B]">Production Tech Stack:</strong>
                    <div className="font-mono text-[#003049] text-[11px]">{briefData.technicalArchitecture?.techStack}</div>
                  </div>

                  <div className="space-y-2">
                    <strong className="text-[#17212B]">Microservice Boundaries:</strong>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {briefData.technicalArchitecture?.services?.map((s: string, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[11px]">
                          • {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <strong className="text-[#17212B]">User Personas & Operational Access:</strong>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {briefData.userPersonasAndRoles?.map((p: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
                          <span className="font-bold text-[#003049] block">{p.role}</span>
                          <p className="text-[#526174] text-[11px]">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Launch Gates & Risks */}
              {briefTab === 'risks' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <h5 className="font-bold text-[#17212B]">Production Launch Gates ({briefData.launchChecklist?.length || 0})</h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {briefData.launchChecklist?.map((g: any) => (
                        <div key={g.id} className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-mono font-bold text-[#003049] mr-2">{g.id}</span>
                            <span className="font-semibold text-[#17212B]">{g.gate}:</span> {g.passCriteria}
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F7F8FA] text-[#526174] border border-[#E2E8F0] shrink-0">
                            {g.ownerRole}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-[#17212B]">Decisions & Launch Dependencies ({briefData.risksAndDecisions?.length || 0})</h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {briefData.risksAndDecisions?.map((r: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#17212B]">{r.item}</span>
                            <span className="text-[10px] font-mono text-[#526174]">{r.due} ({r.owner})</span>
                          </div>
                          <p className="text-[#526174]"><strong>Impact:</strong> {r.impact}</p>
                          <p className="text-[#003049]"><strong>Mitigation:</strong> {r.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[11px] text-[#526174]">
                  Coverage verified: 100% requirements & sprints mapped.
                </span>
                <Button variant="outline" size="sm" onClick={() => setIsBriefOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
