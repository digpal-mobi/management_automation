'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Ticket, Message } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setMessages, addMessage, setAskingAi } from '@/store/chatSlice';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import {
  Sparkles,
  Send,
  Bot,
  User,
  BookOpen,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Database,
  Code2,
} from 'lucide-react';

interface TicketChatPanelProps {
  ticket: Ticket;
}

export function TicketChatPanel({ ticket }: TicketChatPanelProps) {
  const dispatch = useAppDispatch();
  const { messages, askingAi } = useAppSelector((state) => state.chat);
  const { currentUser } = useAppSelector((state) => state.project);

  const [inputMessage, setInputMessage] = useState('');
  const [mode, setMode] = useState<'ai' | 'human'>('ai');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [openCitations, setOpenCitations] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch ticket messages and subscribe to WebSocket room
  useEffect(() => {
    socketClient.joinTicket(ticket.id);

    api.getTicketMessages(ticket.id).then((res) => {
      if (res.success && res.messages) {
        dispatch(setMessages(res.messages));
      }
    });

    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.ticketId === ticket.id) {
        dispatch(addMessage(newMsg));
      }
    };

    socket.on('message:created', handleNewMessage);

    return () => {
      socket.off('message:created', handleNewMessage);
      socketClient.leaveTicket(ticket.id);
    };
  }, [ticket.id, dispatch]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, askingAi]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || askingAi) return;

    setInputMessage('');

    if (mode === 'ai' || customText) {
      // Send as AI Developer Q&A
      dispatch(setAskingAi(true));
      try {
        await api.askAi(ticket.id, {
          message: textToSend,
          senderId: currentUser?.id,
          senderName: currentUser?.name || 'Developer',
        });
      } catch (err) {
        console.error('Failed to ask AI:', err);
      } finally {
        dispatch(setAskingAi(false));
      }
    } else {
      // Send as Human Team Note
      try {
        await api.postTicketMessage(ticket.id, {
          content: textToSend,
          senderId: currentUser?.id,
          senderName: currentUser?.name || 'Developer',
          senderType: 'USER',
        });
      } catch (err) {
        console.error('Failed to post human message:', err);
      }
    }
  };

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleCitation = (msgId: string) => {
    setOpenCitations((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Quick Prompt Pills
  const promptPills = [
    { label: 'Suggest API Endpoint Architecture', query: 'What REST/API endpoints should I implement for this ticket and what are their payload schemas?' },
    { label: 'Database Schema & Models', query: 'How should I structure the database models, relations, and indexes for this feature?' },
    { label: 'Implementation Steps & Edge Cases', query: 'What are the critical implementation steps, security considerations, and potential edge cases?' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950/90 border-l border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              AI Developer Assistant & Discussion
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              pgvector RAG Context Grounded
            </span>
          </div>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              mode === 'ai'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            Ask AI
          </button>
          <button
            type="button"
            onClick={() => setMode('human')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              mode === 'human'
                ? 'bg-slate-800 text-slate-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Team Note
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && !askingAi && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-1">
                Developer Pair Programmer Ready
              </h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Ask anything about architecture, schema designs, API contracts, or technical patterns. Grounded in the project PRD.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isAi = msg.senderType === 'AI';
          const citations = Array.isArray(msg.citations) ? msg.citations : [];
          const hasCitations = citations.length > 0;
          const isCitationsOpen = openCitations[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1.5 ${
                isAi ? 'items-start' : 'items-end'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                {isAi ? (
                  <>
                    <span className="flex items-center gap-1 font-semibold text-indigo-400">
                      <Sparkles className="h-3 w-3" />
                      Antigravity AI
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] text-slate-500">Staff Tech Lead</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-300">
                      {msg.senderName || msg.sender?.name || 'Developer'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl p-4 max-w-[92%] text-xs shadow-sm ${
                  isAi
                    ? 'bg-slate-900 border border-indigo-500/30 text-slate-200 rounded-tl-sm'
                    : 'bg-indigo-600 text-white rounded-tr-sm'
                }`}
              >
                {/* Content */}
                <div
                  className={`prose prose-invert prose-xs max-w-none ${
                    isAi ? 'text-slate-200' : 'text-white'
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        return !inline ? (
                          <div className="relative my-2 rounded-lg bg-slate-950 p-3 border border-slate-800 text-[11px] font-mono">
                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80 text-[10px] text-slate-400">
                              <span>{match ? match[1] : 'code'}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(codeString, msg.id)}
                                className="flex items-center gap-1 hover:text-slate-200"
                              >
                                {copiedIndex === msg.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="overflow-x-auto custom-scrollbar">
                              <code {...props}>{children}</code>
                            </pre>
                          </div>
                        ) : (
                          <code
                            className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px] text-indigo-300"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Citations Box for AI Messages */}
                {isAi && hasCitations && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => toggleCitation(msg.id)}
                      className="flex items-center justify-between w-full text-[10px] font-medium text-slate-400 hover:text-slate-200 py-0.5"
                    >
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 text-indigo-400" />
                        Retrieved PRD Citations ({citations.length} chunks)
                      </span>
                      {isCitationsOpen ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {isCitationsOpen && (
                      <div className="space-y-1.5 pt-2">
                        {citations.map((c, i) => (
                          <div
                            key={i}
                            className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] space-y-1"
                          >
                            <div className="flex items-center justify-between text-indigo-300 font-semibold">
                              <span>§ {c.section}</span>
                              <span className="font-mono text-slate-500">
                                dist: {c.distance}
                              </span>
                            </div>
                            <p className="text-slate-400 italic line-clamp-2">
                              "{c.snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* AI Typing / Thinking Indicator */}
        {askingAi && (
          <div className="flex flex-col space-y-1.5 items-start">
            <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-indigo-400">
                <Sparkles className="h-3 w-3 animate-spin" />
                Antigravity AI
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] text-slate-500">Searching pgvector & reasoning...</span>
            </div>
            <div className="rounded-2xl rounded-tl-sm p-4 bg-slate-900 border border-indigo-500/30 text-slate-300 max-w-[85%] text-xs flex items-center gap-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                Grounding response in PRD...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/30 overflow-x-auto flex gap-1.5 custom-scrollbar">
        {promptPills.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(undefined, p.query)}
            disabled={askingAi}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-[10px] font-medium text-slate-300 transition-colors disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Box Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-slate-950 border-t border-slate-800"
      >
        <div className="relative flex items-center">
          <textarea
            rows={2}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              mode === 'ai'
                ? 'Ask AI pair programmer about APIs, models, schemas... (⌘+Enter)'
                : 'Post a discussion note to teammates...'
            }
            className="w-full resize-none rounded-xl bg-slate-900 border border-slate-800 pl-3.5 pr-12 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || askingAi}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white transition-all disabled:opacity-40 ${
              mode === 'ai'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/30'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
