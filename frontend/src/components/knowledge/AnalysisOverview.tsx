'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ProjectAnalysis } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import {
  Sparkles,
  Layers,
  HelpCircle,
  ShieldAlert,
  Milestone,
  CheckCircle2,
  BookOpen,
  RotateCw,
  Compass,
  ArrowRight,
} from 'lucide-react';

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
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div>
            <CardTitle>
              <Sparkles className="h-4 w-4 text-[#003049]" />
              <span>AI Project Understanding & Requirements Extraction</span>
            </CardTitle>
            <p className="text-[11px] text-[#526174] mt-0.5">
              Synthesized from project metadata and processed knowledge documents
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="primary"
                size="sm"
                isLoading={isRunning}
                onClick={handleRunAnalysis}
                leftIcon={<RotateCw className="h-3.5 w-3.5" />}
              >
                {analysis ? 'Re-Analyze Knowledge' : 'Run AI Analysis'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      {!analysis ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6 text-[#003049]" />}
          title="No Analysis Generated Yet"
          description="Trigger AI analysis to extract functional requirements, modules, architecture constraints, release milestones, and open questions from your project specification and documents."
          action={
            canEdit ? (
              <Button
                variant="primary"
                size="md"
                isLoading={isRunning}
                onClick={handleRunAnalysis}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Generate Project Understanding
              </Button>
            ) : undefined
          }
        />
      ) : (
        <CardContent className="space-y-8 divide-y divide-[#E2E8F0]">
          {/* 1. Overview */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#003049] flex items-center gap-1.5 font-bold">
              <BookOpen className="h-3.5 w-3.5 text-[#003049]" />
              <span>Executive Project Overview</span>
            </h4>
            <p className="text-xs text-[#17212B] leading-relaxed bg-[#EFF5F9] p-4 rounded-xl border border-[#669BBC]/30">
              {analysis.overview || 'Overview not generated.'}
            </p>
          </div>

          {/* 2. Functional Requirements */}
          {analysis.functionalRequirements && analysis.functionalRequirements.length > 0 && (
            <div className="pt-6 space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#526174] flex items-center gap-1.5 font-bold">
                <Layers className="h-3.5 w-3.5 text-[#003049]" />
                <span>Functional Requirements ({analysis.functionalRequirements.length})</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.functionalRequirements.map((req, idx) => {
                  const title = typeof req === 'string' ? req : req.title;
                  const desc = typeof req === 'string' ? '' : req.description;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] text-xs text-[#17212B] flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#003049] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#17212B] block">{title}</span>
                        {desc && desc !== title && (
                          <span className="text-[11px] text-[#526174] mt-0.5 block">
                            {desc}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Non-Functional / Constraints - Papaya Whip Surface */}
          {analysis.nonFunctionalRequirements && analysis.nonFunctionalRequirements.length > 0 && (
            <div className="pt-6 space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#780000] flex items-center gap-1.5 font-bold">
                <ShieldAlert className="h-3.5 w-3.5 text-[#780000]" />
                <span>Non-Functional & Architectural Constraints ({analysis.nonFunctionalRequirements.length})</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.nonFunctionalRequirements.map((nfr, idx) => {
                  const text = typeof nfr === 'string' ? nfr : nfr.description || nfr.category;
                  const cat = typeof nfr === 'string' ? '' : nfr.category;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#FDF0D5]/50 border border-[#F7DFAB] text-xs text-[#17212B] flex items-start gap-2.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#780000] mt-2 flex-shrink-0" />
                      <div>
                        {cat && cat !== text && (
                          <span className="text-[10px] font-mono uppercase text-[#780000] block mb-0.5 font-bold">
                            {cat}
                          </span>
                        )}
                        <span>{text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Release Milestones */}
          {analysis.milestones && analysis.milestones.length > 0 && (
            <div className="pt-6 space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#526174] flex items-center gap-1.5 font-bold">
                <Milestone className="h-3.5 w-3.5 text-[#003049]" />
                <span>Target Milestones & Phasing ({analysis.milestones.length})</span>
              </h4>
              <div className="space-y-2.5">
                {analysis.milestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[#17212B]">{m.name || `Phase ${idx + 1}`}</span>
                    {m.targetDate && (
                      <span className="text-[#526174] font-mono text-[11px]">{m.targetDate}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Open Questions - Flag Red / Warning Alert Surface */}
          {analysis.openQuestions && analysis.openQuestions.length > 0 && (
            <div className="pt-6 space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#C1121F] flex items-center gap-1.5 font-bold">
                <HelpCircle className="h-3.5 w-3.5 text-[#C1121F]" />
                <span>Open Questions & Architecture Ambiguities ({analysis.openQuestions.length})</span>
              </h4>
              <div className="space-y-2.5">
                {analysis.openQuestions.map((q, idx) => {
                  const text = typeof q === 'string' ? q : q.question;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#FDF2F2]/60 border border-[#FDE8E8] text-xs text-[#17212B] flex items-start gap-2.5"
                    >
                      <span className="font-mono text-[#C1121F] font-bold">{idx + 1}.</span>
                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Callout: Proceed to Roadmap & Generate Tickets */}
          <div className="pt-6">
            <div className="p-5 rounded-2xl bg-[#EFF5F9] border border-[#669BBC]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#003049] flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-[#003049]" />
                  <span>Roadmap Features & Autonomous Ticket Generation</span>
                </h4>
                <p className="text-[11px] text-[#526174]">
                  AI has synthesized your documentation into modules and proposed candidate roadmap features. Review them and generate developer-ready backlog tickets directly onto your Kanban board.
                </p>
              </div>
              <Link href={`/projects/${projectId}/roadmap`}>
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Go to Roadmap & Generate Tickets
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
