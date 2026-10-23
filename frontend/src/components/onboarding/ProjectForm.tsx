'use client';

import React, { useState, useRef } from 'react';
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
  UploadCloud,
  FileText,
  FileCheck,
  X,
  Sparkles,
  FileCode,
} from 'lucide-react';
import Link from 'next/link';

export function ProjectForm() {
  const router = useRouter();
  const { fetchWithAuth } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Documents & PRD input
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPastePrd, setShowPastePrd] = useState(false);
  const [prdText, setPrdText] = useState('');

  // Optional fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [goals, setGoals] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [techStack, setTechStack] = useState('');
  const [businessRequirements, setBusinessRequirements] = useState('');
  const [technicalConstraints, setTechnicalConstraints] = useState('');
  const [knownDependencies, setKnownDependencies] = useState('');
  const [targetReleaseDate, setTargetReleaseDate] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesAdded = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...fileArray]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError('Project name and short description are required.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      setSubmitStep('Creating project workspace...');

      // 1. Create project with all specifications
      const res = await fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          prdText: prdText.trim() || null,
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
        throw new Error(data.error || 'Failed to create project');
      }

      const projectId = data.project.id;

      // 2. Upload attached documents if any
      if (selectedFiles.length > 0) {
        setSubmitStep(`Uploading ${selectedFiles.length} PRD specification document(s)...`);
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const docRes = await fetchWithAuth(`/api/projects/${projectId}/documents`, {
          method: 'POST',
          body: formData,
        });
        const docData = await docRes.json();
        if (!docRes.ok || !docData.success) {
          console.warn('Document upload warning:', docData.error);
        }
      }

      // 3. Trigger initial AI analysis if documents or PRD text provided
      if (selectedFiles.length > 0 || prdText.trim()) {
        setSubmitStep('Initiating AI analysis & feature extraction...');
        try {
          await fetchWithAuth(`/api/projects/${projectId}/analysis/run`, {
            method: 'POST',
          });
        } catch (analysisErr) {
          console.warn('Initial analysis warning:', analysisErr);
        }
      }

      toast.success('Project workspace created with knowledge base initialized!');
      router.push(`/projects/${projectId}/knowledge`);
    } catch (err: any) {
      console.error('Project creation failed:', err);
      setError(err.message || 'Failed to create project. Please try again.');
      setIsSubmitting(false);
      setSubmitStep(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        backLink={{ label: 'Back to Workspaces', href: '/' }}
        icon={<FolderKanban className="h-6 w-6 text-[#003049]" />}
        title="Create New Project"
        description="Initialize your project workspace. Upload technical PRDs, architecture PDFs, or specifications so the AI can extract modules, constraints, and generate backlog tickets."
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
        {/* Card 1: Core Info */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-sm font-bold text-[#17212B] flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[#003049]" />
              <span>Project Information</span>
            </h3>

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
          </CardContent>
        </Card>

        {/* Card 2: PRD & Documentation Ingestion */}
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#17212B] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#003049]" />
                  <span>PRD Documents & Technical Specifications</span>
                </h3>
                <p className="text-xs text-[#526174] mt-0.5">
                  Attach PDFs, Word docs, Markdown, or paste PRDs for autonomous requirements & ticket generation.
                </p>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 ${
                isDragging
                  ? 'border-[#003049] bg-[#EFF5F9]'
                  : 'border-[#CBD5E1] hover:border-[#003049] bg-[#FDFDFE] hover:bg-[#F7F8FA]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.md,.txt,.xlsx,.csv"
                className="hidden"
                onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
              />

              <div className="max-w-md mx-auto space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#EFF5F9] border border-[#669BBC]/30 flex items-center justify-center mx-auto text-[#003049]">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#17212B]">
                    Drag and drop PRDs or click to select files
                  </p>
                  <p className="text-[11px] text-[#526174]">
                    Supports PDF, DOCX, Markdown, Text, and Excel (.pdf, .docx, .md, .txt, .xlsx)
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-semibold text-[#17212B]">
                  Selected Documents ({selectedFiles.length}):
                </p>
                <div className="space-y-1.5">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#EFF5F9]/50 border border-[#669BBC]/20 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-[#003049] flex-shrink-0" />
                        <span className="font-medium text-[#17212B] truncate">{file.name}</span>
                        <span className="text-[10px] text-[#526174] font-mono">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 rounded-lg hover:bg-[#FDF2F2] text-[#526174] hover:text-[#C1121F] transition-colors"
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Toggle Paste PRD Text */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPastePrd(!showPastePrd)}
                className="flex items-center gap-1.5 text-xs text-[#003049] hover:underline font-medium"
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>{showPastePrd ? 'Hide PRD Text Paste' : 'Or Paste PRD / Markdown Text Directly'}</span>
              </button>
            </div>

            {showPastePrd && (
              <div className="pt-2">
                <Textarea
                  label="PRD Markdown / Requirements Text"
                  rows={6}
                  value={prdText}
                  onChange={(e) => setPrdText(e.target.value)}
                  placeholder="# Product Requirements Document&#10;&#10;## 1. Overview&#10;Describe user problem and solution...&#10;&#10;## 2. Core Modules & Features&#10;- Feature A: Authentication...&#10;- Feature B: Analytics dashboard..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Optional Architecture Specifications */}
        <Card>
          <CardContent className="space-y-4">
            <div>
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
                    ? 'Hide Optional Architecture & Metadata'
                    : 'Add Optional Goals, Tech Stack & Constraints (Can be configured later)'}
                </span>
              </button>
            </div>

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
                  label="Business Requirements"
                  value={businessRequirements}
                  onChange={(e) => setBusinessRequirements(e.target.value)}
                  placeholder="e.g. PCI-DSS compliance, Multi-currency payments"
                />

                <Input
                  label="Known Dependencies"
                  value={knownDependencies}
                  onChange={(e) => setKnownDependencies(e.target.value)}
                  placeholder="e.g. Stripe API, ShipEngine, SendGrid"
                />

                <Textarea
                  label="Additional Notes / Scope"
                  rows={2}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any extra context, rollout strategies, or team notes..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buttons & Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <Link href="/">
            <Button variant="ghost" size="sm" type="button">
              Cancel
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            {submitStep && (
              <span className="text-xs text-[#003049] font-medium animate-pulse">
                {submitStep}
              </span>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting || !name.trim() || !description.trim()}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {selectedFiles.length > 0 || prdText.trim()
                ? 'Create & Ingest Knowledge'
                : 'Create Workspace'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
