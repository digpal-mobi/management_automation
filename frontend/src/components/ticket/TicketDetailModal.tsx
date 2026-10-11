'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setActiveTicket } from '@/store/boardSlice';
import { TicketDescriptionPanel } from './TicketDescriptionPanel';
import { TicketChatPanel } from './TicketChatPanel';
import { X, Maximize2, Minimize2, MessageSquare, FileText } from 'lucide-react';

export function TicketDetailModal() {
  const dispatch = useAppDispatch();
  const { activeTicket } = useAppSelector((state) => state.board);
  const [mobileTab, setMobileTab] = useState<'details' | 'chat'>('details');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(setActiveTicket(null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  if (!activeTicket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Dialog */}
      <div
        className={`relative flex flex-col w-full bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullScreen
            ? 'h-[98vh] max-w-[99vw]'
            : 'h-[90vh] max-w-7xl'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              TICKET-{activeTicket.id.slice(0, 6).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-slate-200 truncate max-w-md hidden sm:inline">
              {activeTicket.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile View Toggle Tabs */}
            <div className="flex md:hidden rounded-lg bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setMobileTab('details')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${
                  mobileTab === 'details'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400'
                }`}
              >
                <FileText className="h-3 w-3" />
                Details
              </button>
              <button
                onClick={() => setMobileTab('chat')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${
                  mobileTab === 'chat'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400'
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                AI Chat
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Close Modal */}
            <button
              onClick={() => dispatch(setActiveTicket(null))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split-Panel UI (Left ~55% / Right ~45%) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Panel (~55% width) — Ticket Description & Checklists */}
          <div
            className={`w-full md:w-[55%] flex flex-col min-h-0 overflow-hidden ${
              mobileTab === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <TicketDescriptionPanel ticket={activeTicket} />
          </div>

          {/* Right Panel (~45% width) — Discussion / AI Q&A */}
          <div
            className={`w-full md:w-[45%] flex flex-col min-h-0 overflow-hidden ${
              mobileTab === 'details' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <TicketChatPanel ticket={activeTicket} />
          </div>
        </div>
      </div>
    </div>
  );
}
