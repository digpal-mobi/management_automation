'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { addProject } from '@/store/projectSlice';
import { IngestionProgress } from './IngestionProgress';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Layers,
  Wand2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export function ProjectForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.project);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState('Next.js 14, Node.js, Express, PostgreSQL, Prisma, pgvector');
  const [goals, setGoals] = useState('Build a scalable developer tool with sub-100ms response times');
  const [constraints, setConstraints] = useState('Strict multi-tenant security, 99.9% uptime, dark-mode-first design');
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

  // Sample PRD Templates for 1-click loading
  const loadTemplate = (type: 'fintech' | 'video' | 'k8s') => {
    if (type === 'fintech') {
      setName('ApexPay - Multi-Currency Ledger & Settlement Engine');
      setDescription('High-throughput double-entry bookkeeping ledger with instant multi-currency FX settlement.');
      setTechStack('Go / Node.js, PostgreSQL with pgvector, Redis, Kafka, Docker');
      setGoals('Sub-50ms idempotency ledger writes, audit compliance (PCI-DSS), zero float discrepancies');
      setConstraints('Strict ACID transactions, cryptographic audit hashing, idempotency keys on all POST requests');
      setPrdText(`# ApexPay Core Ledger Engine PRD

## 1. Product Overview
ApexPay provides double-entry accounting for fintech apps. Every financial transaction writes balanced credits and debits to an immutable ledger table.

## 2. Core Modules
### 2.1 Double-Entry Transaction Ledger
- Accounts table with account_type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
- Ledger entries table with balance constraint: sum(credits) == sum(debits)
- Immutable row inserts; corrections made only via compensating reversal entries

### 2.2 Idempotency Key Middleware
- Unique header \`Idempotency-Key\` cached in Redis for 24 hours
- Duplicate requests return identical previous response without re-executing transfers

### 2.3 Foreign Exchange (FX) Converter
- Live FX rate caching and automated spread markup calculation
- Multi-currency wallet balance calculation in base currency

### 2.4 Audit & Compliance Log
- SHA-256 tamper-evident hash chaining across ledger blocks
- Webhook dispatch on flagged suspicious velocity (> 10 transfers/min)
`);
    } else if (type === 'video') {
      setName('Synthetix - AI Video Canvas & Collaboration');
      setDescription('Browser-based generative video editor with collaborative timeline, timeline markers, and AI generation.');
      setTechStack('Next.js 14, WebAssembly, Python (Flask), FFmpeg, WebSockets, PostgreSQL');
      setGoals('Real-time timeline playback at 60fps, collaborative multi-cursor presence, AI scene inpainting');
      setConstraints('Render latency < 2s for 1080p previews, WebCodecs hardware acceleration');
      setPrdText(`# Synthetix AI Video Canvas PRD

## 1. Overview
Synthetix empowers creators to generate, edit, and collaborate on videos directly inside the browser using WebAssembly FFmpeg and serverless GPU workers.

## 2. Feature Specifications
### 2.1 Collaborative Multi-Track Timeline
- Audio, video, and text subtitle tracks with drag-and-drop trim handles
- Snapping to 1-frame grid and audio waveform visualization
- Real-time cursor presence and track lock via WebSockets

### 2.2 Generative AI Scene Inpainting
- Text-to-video scene interpolation via diffusion pipeline
- Mask drawing canvas tool over video frame viewport

### 2.3 WebAssembly Export Pipeline
- Client-side FFmpeg WebAssembly compilation for quick 720p exports
- Cloud GPU rendering queue for 4K ProRes exports
`);
    } else if (type === 'k8s') {
      setName('FleetOps - Autonomous Kubernetes Cluster Manager');
      setDescription('Multi-cloud Kubernetes cluster fleet manager with automated health healing and rollouts.');
      setTechStack('Next.js, Express, Go, PostgreSQL, pgvector, Kubernetes API client');
      setGoals('Unified control plane for 50+ EKS and GKE clusters with automated canary rollbacks');
      setConstraints('Cluster agent overhead < 0.1% CPU, strict RBAC isolation');
      setPrdText(`# FleetOps Autonomous Cluster Manager PRD

## 1. Executive Summary
FleetOps provides DevOps engineers with declarative fleet orchestration across multi-region Kubernetes clusters.

## 2. System Architecture
### 2.1 Fleet Gateway & Agent Controller
- Secure mutual TLS (mTLS) tunneling between cluster agents and central control plane
- CRD watching for \`FleetDeployment\` specifications

### 2.2 Automated Canary Rollout Engine
- Progressive traffic shifting (10% -> 25% -> 50% -> 100%)
- Anomaly scoring on HTTP 5xx error rates with automatic rollback trigger

### 2.3 Semantic Log Search with pgvector
- Embedding pod crash logs into 1536-dim vector space
- Natural language log diagnosis (e.g., "Find out-of-memory errors on redis pods")
`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !prdText.trim()) {
      setError('Please provide a project name, description, and PRD specification.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const result = await api.createProject({
        name: name.trim(),
        description: description.trim(),
        techStack: techStack.trim(),
        goals: goals.trim(),
        constraints: constraints.trim(),
        prdText: prdText.trim(),
        createdById: currentUser?.id,
      });

      if (result.success && result.project) {
        dispatch(addProject(result.project));
        // Redirect to new board
        router.push(`/projects/${result.project.id}/board`);
      }
    } catch (err: any) {
      console.error('Project creation failed:', err);
      setError(err.message || 'Failed to ingest PRD and generate tickets. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="py-12">
        <IngestionProgress projectName={name || 'Project'} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" />
          Autonomous AI Project Onboarding
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Ingest PRD & Auto-Generate Kanban Board
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
          Provide your project requirements, architecture specs, or PRD. Our AI agent will chunk the document into pgvector semantic memory, evaluate feature complexity adaptively, and generate developer-ready tickets with full acceptance criteria checklists.
        </p>
      </div>

      {/* Preset Templates Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Wand2 className="h-4 w-4 text-indigo-400" />
            Quick Start with Example PRD Templates:
          </span>
          <span className="text-[11px] text-slate-500">1-click autofill</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => loadTemplate('fintech')}
            className="flex flex-col text-left p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all text-xs group"
          >
            <span className="font-bold text-slate-200 group-hover:text-indigo-300 mb-0.5">
              💳 Fintech Core Ledger
            </span>
            <span className="text-[11px] text-slate-500 line-clamp-1">
              Double-entry bookkeeping & multi-currency FX
            </span>
          </button>

          <button
            type="button"
            onClick={() => loadTemplate('video')}
            className="flex flex-col text-left p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all text-xs group"
          >
            <span className="font-bold text-slate-200 group-hover:text-indigo-300 mb-0.5">
              🎬 AI Video Canvas Studio
            </span>
            <span className="text-[11px] text-slate-500 line-clamp-1">
              Timeline tracks, WebCodecs & FFmpeg inpainting
            </span>
          </button>

          <button
            type="button"
            onClick={() => loadTemplate('k8s')}
            className="flex flex-col text-left p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all text-xs group"
          >
            <span className="font-bold text-slate-200 group-hover:text-indigo-300 mb-0.5">
              ☸️ FleetOps Kubernetes
            </span>
            <span className="text-[11px] text-slate-500 line-clamp-1">
              Cluster fleet manager with canary rollouts
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Project Name *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CloudPulse Telemetry Engine"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Tech Stack */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Tech Stack Details</span>
              <span className="text-[10px] text-slate-500 font-normal">Informs technical notes</span>
            </label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="e.g. Next.js 14, Express, PostgreSQL, Prisma, Redis"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Short Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">
            Project Description & Mission *
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this product do and who is it built for?"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Goals & Constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Target Goals & Success Metrics
            </label>
            <input
              type="text"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Sub-50ms latency, 99.9% uptime, 10k MAU"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Constraints & Non-Functional Requirements
            </label>
            <input
              type="text"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="e.g. Strict RBAC, SOC2 compliance, WCAG 2.1 AA"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* PRD Document Ingestion */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>Product Requirements Document (PRD) *</span>
            </label>

            {/* Upload File Button */}
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors">
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Upload .md / .txt</span>
              <input
                type="file"
                accept=".md,.txt,.markdown"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="relative">
            <textarea
              required
              rows={12}
              value={prdText}
              onChange={(e) => setPrdText(e.target.value)}
              placeholder="# Project Requirements Document (PRD)&#10;&#10;## 1. Feature Specifications&#10;Describe each module, endpoints, user workflows, and database tables in detail...&#10;&#10;The AI will autonomously chunk and parse these requirements to generate developer-ready tickets."
              className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed custom-scrollbar"
            />
            <div className="absolute right-3 bottom-3 text-[10px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              {prdText.split(/\s+/).filter(Boolean).length} words
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end gap-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Ingest PRD & Generate Tickets Now
          </Button>
        </div>
      </form>
    </div>
  );
}
