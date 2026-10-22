'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ProjectAnalysis } from '@/types';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  Layers,
  HelpCircle,
  ShieldAlert,
  Milestone,
  CheckCircle2,
  Cpu,
  BookOpen,
  ArrowRight,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface AnalysisOverviewProps {
  projectId: string;
  analysis: ProjectAnalysis | null;
  onAnalysisComplete: () => void;
  canEdit: boolean;
  hasDocuments: boolean;
}

export function AnalysisOverview({
  projectId,
  analysis,
  onAnalysisComplete,
  canEdit,
  hasDocuments,
}: AnalysisOverviewProps) {
  const { fetchWithAuth } = useAuth();
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAnalysis = async () => {
    try {
      setIsRunning(true);
      const res = await fetchWithAuth(`/api/projects/${projectId}/analysis/run`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete project analysis');
      }

      toast.success('Project knowledge analyzed and roadmap synchronized.');
      onAnalysisComplete();
    } catch (err: any) {
      console.error('Analysis error:', err);
      toast.error(err.message || 'Error running analysis');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden space-y-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2A2A2A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-white" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              AI Project Understanding & Requirements Extraction
            </h3>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Synthesized from project metadata and processed knowledge documents
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={isRunning}
              onClick={handleRunAnalysis}
              className="text-xs font-semibold"
            >
              <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Analyzing Knowledge...' : analysis ? 'Re-Analyze Knowledge' : 'Run AI Analysis'}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {!analysis ? (
        <div className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center mx-auto text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">No Analysis Generated Yet</h4>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
              Trigger AI analysis to extract functional requirements, modules, architecture constraints, release milestones, and open questions from your project specification and documents.
            </p>
          </div>
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              disabled={isRunning}
              onClick={handleRunAnalysis}
              className="text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {isRunning ? 'Analyzing...' : 'Generate Project Understanding'}
            </Button>
          )}
        </div>
      ) : (
        <div className="p-6 space-y-8 divide-y divide-[#2A2A2A]">
          {/* 1. Overview */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-white" />
              <span>Executive Project Overview</span>
            </h4>
            <p className="text-xs text-neutral-200 leading-relaxed bg-[#141414] p-4 rounded-xl border border-[#2A2A2A]">
              {analysis.overview || 'Overview not generated.'}
            </p>
          </div>

          {/* 2. Functional Requirements */}
          {analysis.functionalRequirements && analysis.functionalRequirements.length > 0 && (
            <div className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-white" />
                  <span>Functional Requirements ({analysis.functionalRequirements.length})</span>
                </h4>
                <Link
                  href={`/projects/${projectId}/roadmap`}
                  className="text-[11px] text-white hover:underline flex items-center gap-1"
                >
                  <span>View in Roadmap</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.functionalRequirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {req.title}
                      </span>
                      {req.module && (
                        <span className="text-[10px] font-mono text-neutral-400 bg-black px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                          {req.module}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {req.description}
                    </p>
                    {req.source && (
                      <span className="text-[10px] text-neutral-500 block pt-1">
                        Source: {req.source}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Non-Functional Requirements & Technical Rules */}
          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Non-Functional */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-white" />
                <span>Non-Functional Requirements</span>
              </h4>

              <div className="space-y-2">
                {(analysis.nonFunctionalRequirements || []).map((nfr, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-1"
                  >
                    <span className="text-xs font-semibold text-white block">
                      {nfr.category}
                    </span>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {nfr.description}
                    </p>
                  </div>
                ))}
                {(!analysis.nonFunctionalRequirements || analysis.nonFunctionalRequirements.length === 0) && (
                  <p className="text-xs text-neutral-500 italic">None identified in source material.</p>
                )}
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-white" />
                <span>Technical Specifications</span>
              </h4>

              <div className="space-y-2">
                {(analysis.technicalRequirements || []).map((tr, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-1"
                  >
                    <span className="text-xs font-semibold text-white block">
                      {tr.area}
                    </span>
                    <p className="text-[11px] text-neutral-400 leading-relaxed font-mono">
                      {tr.details}
                    </p>
                  </div>
                ))}
                {(!analysis.technicalRequirements || analysis.technicalRequirements.length === 0) && (
                  <p className="text-xs text-neutral-500 italic">None identified in source material.</p>
                )}
              </div>
            </div>
          </div>

          {/* 4. Milestones */}
          {analysis.milestones && analysis.milestones.length > 0 && (
            <div className="pt-6 space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Milestone className="h-3.5 w-3.5 text-white" />
                <span>Milestones & Release Targets</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analysis.milestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">
                        {m.name}
                      </span>
                      {m.isConfirmed ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-black font-bold">
                          Confirmed
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0A0A0A] text-neutral-400 border border-[#2A2A2A]">
                          Suggested
                        </span>
                      )}
                    </div>
                    {m.targetDate && (
                      <span className="text-[11px] text-neutral-300 block font-mono">
                        Target: {m.targetDate}
                      </span>
                    )}
                    {m.details && (
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        {m.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Open Questions & Ambiguities */}
          {analysis.openQuestions && analysis.openQuestions.length > 0 && (
            <div className="pt-6 space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-white" />
                <span>Open Questions & Ambiguities ({analysis.openQuestions.length})</span>
              </h4>
              <p className="text-[11px] text-neutral-500">
                Identified gaps, missing parameters, or conflicts that need PM resolution prior to development
              </p>

              <div className="space-y-2.5">
                {analysis.openQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {q.question}
                      </span>
                      {q.category && (
                        <span className="text-[10px] font-mono text-neutral-400 bg-black px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                          {q.category}
                        </span>
                      )}
                    </div>
                    {q.impact && (
                      <p className="text-[11px] text-neutral-400">
                        <strong className="text-neutral-300">Technical Impact:</strong> {q.impact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
