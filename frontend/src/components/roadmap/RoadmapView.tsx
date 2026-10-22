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
import {
  Map,
  Plus,
  Edit2,
  Trash2,
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

  return (
    <div className="space-y-6">
      {/* Action Bar & Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A]">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white cursor-pointer"
          >
            <option value="ALL">All Modules ({features.length})</option>
            {allModules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white cursor-pointer"
          >
            <option value="ALL">All Review Statuses</option>
            <option value="PROPOSED">Proposed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DEFERRED">Deferred</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Add Manual Feature Button */}
          {canEdit && (
            <Button
              variant="primary"
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
        <div className="p-16 text-center rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center mx-auto text-white">
            <Map className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">No Features Identified Yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
              Run AI analysis on your project knowledge base to extract proposed features, or manually add your first roadmap capability.
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Feature Manually
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Grouped Features Modules */
        <div className="space-y-8">
          {Object.entries(groupedByModule).map(([moduleName, moduleFeatures]) => (
            <div
              key={moduleName}
              className="rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden"
            >
              {/* Module Header */}
              <div className="px-5 py-3.5 border-b border-[#2A2A2A] bg-[#101010] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-white" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {moduleName}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#141414] text-neutral-400 border border-[#2A2A2A]">
                    {moduleFeatures.length} feature(s)
                  </span>
                </div>
              </div>

              {/* Feature Cards in Module */}
              <div className="divide-y divide-[#2A2A2A]">
                {moduleFeatures.map((feature) => {
                  const ticketCount = feature.tickets?.length || 0;

                  return (
                    <div
                      key={feature.id}
                      className="p-5 hover:bg-[#101010] transition-colors space-y-3"
                    >
                      {/* Top Row: Name, Status, Priority, Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-white">
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
                            {feature.isAiGenerated && (
                              <span className="text-[10px] font-mono text-neutral-500 bg-[#141414] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                                AI Identified
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
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-black hover:bg-neutral-200 transition-colors"
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
                                className="px-2.5 py-1 rounded-lg text-[11px] text-neutral-400 hover:text-white bg-[#141414] border border-[#2A2A2A] transition-colors"
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
                              <TicketIcon className="h-3 w-3 mr-1" />
                              <span>Generate Tickets</span>
                            </Button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(feature)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#141414] border border-transparent hover:border-[#2A2A2A] transition-colors"
                              title="Edit feature specifications"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteFeature(feature.id, feature.name)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#141414] border border-transparent hover:border-[#2A2A2A] transition-colors"
                              title="Delete feature"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {feature.description}
                      </p>

                      {/* Business Value & Constraints */}
                      {feature.businessValue && (
                        <div className="text-[11px] text-neutral-400">
                          <strong className="text-neutral-300">Business Value:</strong>{' '}
                          {feature.businessValue}
                        </div>
                      )}

                      {/* Meta Footer: Dependencies, Source References, Linked Tickets */}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-400 pt-2 border-t border-[#1C1C1C]">
                        {/* Dependencies */}
                        {feature.dependencies && feature.dependencies.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <GitBranch className="h-3 w-3 text-neutral-400" />
                            <span className="text-neutral-500">Prerequisites:</span>
                            <span className="text-neutral-300">
                              {feature.dependencies.join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Source References */}
                        {feature.sourceReferences && feature.sourceReferences.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3 text-neutral-400" />
                            <span className="text-neutral-500">Source:</span>
                            <span className="text-neutral-300">
                              {feature.sourceReferences[0].docTitle}{' '}
                              {feature.sourceReferences[0].location &&
                                `(${feature.sourceReferences[0].location})`}
                            </span>
                          </div>
                        )}

                        {/* Linked Tickets Count */}
                        {ticketCount > 0 && (
                          <div className="flex items-center gap-1 text-white font-medium ml-auto">
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
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Feature Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Audit Logging & Compliance Export"
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Module / Subsystem
                </label>
                <input
                  type="text"
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  placeholder="e.g. Security & Compliance"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Description *
              </label>
              <textarea
                rows={3}
                required
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Detailed scope of the planned feature..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white custom-scrollbar"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Business Value / Objective
              </label>
              <input
                type="text"
                value={newBusinessValue}
                onChange={(e) => setNewBusinessValue(e.target.value)}
                placeholder="Why is this valuable to users or the business?"
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Prerequisites / Dependencies (Comma-separated)
              </label>
              <input
                type="text"
                value={newDependencies}
                onChange={(e) => setNewDependencies(e.target.value)}
                placeholder="e.g. User Authentication, Database Schema"
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A2A2A]">
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
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Feature Name *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Module
                </label>
                <input
                  type="text"
                  value={editModule}
                  onChange={(e) => setEditModule(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Priority
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as FeatureReviewStatus)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value="PROPOSED">Proposed</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="DEFERRED">Deferred</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Description *
              </label>
              <textarea
                rows={3}
                required
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white custom-scrollbar"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                Business Value
              </label>
              <input
                type="text"
                value={editBusinessValue}
                onChange={(e) => setEditBusinessValue(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A2A2A]">
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
              <TicketIcon className="h-4 w-4 text-white" />
              <span>Generate Tickets for Feature</span>
            </DialogTitle>
            <DialogDescription>
              Generate granular, developer-ready tickets scoped specifically to{' '}
              <strong>"{generatingForFeature?.name}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-1">
              <span className="text-xs font-semibold text-white block">
                Feature Scope:
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {generatingForFeature?.description}
              </p>
            </div>

            {generatedTickets ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>Generated Tickets ({generatedTickets.length}):</span>
                  <span className="text-[11px] text-neutral-400">Added to project backlog</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {generatedTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {t.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="type" type={t.type} size="sm" />
                          <Badge variant="priority" priority={t.priority} size="sm" />
                        </div>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2">
                        {t.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 leading-relaxed">
                Click below to generate implementation tickets with acceptance criteria, technical notes, and complexity estimates. Tickets will enter the project backlog for your review.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A2A2A]">
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
    </div>
  );
}
