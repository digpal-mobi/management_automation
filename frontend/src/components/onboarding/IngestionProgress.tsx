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
    <div className="max-w-xl mx-auto p-8 rounded-2xl bg-[#0A0A0A] border border-[#2A2A2A] shadow-xl space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#141414] border border-[#2A2A2A] mb-2">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">
          AI Analysis & Setup in Progress
        </h3>
        <p className="text-xs text-[#A3A3A3]">
          Synthesizing <span className="text-white font-semibold">{projectName}</span> into technical roadmap
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-[#A3A3A3]">
          <span>PIPELINE PROGRESS</span>
          <span className="text-white font-bold">{progressPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#141414] rounded-full overflow-hidden border border-[#2A2A2A]">
          <div
            className="h-full bg-white rounded-full transition-all duration-700 ease-out"
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
                  ? 'bg-[#141414] border-white shadow-sm'
                  : isDone
                  ? 'bg-[#0A0A0A] border-[#2A2A2A] opacity-80'
                  : 'bg-transparent border-transparent opacity-40'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <IconComponent className="h-5 w-5 text-[#525252]" />
                )}
              </div>

              <div className="flex-1 space-y-0.5">
                <div
                  className={`text-xs font-semibold ${
                    isCurrent
                      ? 'text-white'
                      : isDone
                      ? 'text-[#F5F5F5]'
                      : 'text-[#525252]'
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-[11px] text-[#A3A3A3]">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
