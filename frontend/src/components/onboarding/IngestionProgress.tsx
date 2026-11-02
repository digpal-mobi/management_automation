'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Loader2, Database, Brain, Cpu, Layers } from 'lucide-react';

interface IngestionProgressProps {
  projectName: string;
}

export function IngestionProgress({ projectName }: IngestionProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progressPct, setProgressPct] = useState(15);

  const steps = [
    {
      title: 'Analyzing PRD & Architecture Structure',
      desc: 'Parsing specifications, user personas, endpoints, and data requirements',
      icon: Brain,
    },
    {
      title: 'Generating pgvector Semantic Memory',
      desc: 'Deconstructing text into chunks & storing vector embeddings',
      icon: Database,
    },
    {
      title: 'Evaluating Feature Complexity Adaptively',
      desc: 'Calculating story points, sub-task breakdowns, and dependencies',
      icon: Cpu,
    },
    {
      title: 'Generating Developer-Ready Kanban Tickets',
      desc: 'Drafting acceptance criteria checklists, technical notes & PR checklists',
      icon: Sparkles,
    },
    {
      title: 'Finalizing Kanban Board & Workflows',
      desc: 'Organizing columns: To Do, In Progress, Done',
      icon: Layers,
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          const next = prev + 1;
          setProgressPct(Math.round(((next + 1) / steps.length) * 95));
          return next;
        }
        return prev;
      });
    }, 2800);

    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="max-w-xl mx-auto p-8 rounded-2xl bg-elevated border border-border shadow-card space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-subtle border border-accent/30 mb-2">
          <Sparkles className="h-7 w-7 text-accent" />
        </div>
        <h3 className="text-lg font-bold text-tp">
          AI Analysis & Setup in Progress
        </h3>
        <p className="text-xs text-ts">
          Synthesizing <span className="text-accent font-semibold">{projectName}</span> into technical roadmap
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-ts">
          <span>PIPELINE PROGRESS</span>
          <span className="text-accent font-bold">{progressPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3 pt-2">
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          const IconComponent = step.icon;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-300 ${
                isCurrent
                  ? 'bg-accent-subtle border-accent shadow-card'
                  : isDone
                  ? 'bg-canvas border-border'
                  : 'bg-transparent border-transparent opacity-40'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 text-accent animate-spin" />
                ) : (
                  <IconComponent className="h-5 w-5 text-tm" />
                )}
              </div>

              <div className="flex-1 space-y-0.5">
                <div
                  className={`text-xs font-semibold ${
                    isCurrent
                      ? 'text-accent'
                      : isDone
                      ? 'text-tp'
                      : 'text-tm'
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-[11px] text-ts">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
