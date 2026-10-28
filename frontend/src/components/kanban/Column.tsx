'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Ticket, BoardColumn, TicketStatus, TicketPriority, ProjectMember } from '@/types';
import { TicketCard } from './TicketCard';
import {
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  AlertTriangle,
  Copy,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Check,
  X,
  ArrowDown,
} from 'lucide-react';

interface ColumnProps {
  column: BoardColumn;
  tickets: Ticket[];
  members?: ProjectMember[];
  columns?: BoardColumn[];
  canManageColumns?: boolean;
  canCreateTicket?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isCompact?: boolean;
  onTicketClick: (ticket: Ticket) => void;
  onAddTicketClick: (column: BoardColumn) => void;
  onRenameColumn?: (column: BoardColumn, newName: string) => void;
  onEditColumn?: (column: BoardColumn) => void;
  onConfigureWip?: (column: BoardColumn) => void;
  onDuplicateColumn?: (column: BoardColumn) => void;
  onDeleteColumn?: (column: BoardColumn) => void;
  onMoveColumnLeft?: (column: BoardColumn) => void;
  onMoveColumnRight?: (column: BoardColumn) => void;
  onToggleCollapse?: (column: BoardColumn) => void;
  // Ticket context actions
  onEditTicketTitle?: (ticket: Ticket) => void;
  onChangeTicketStatus?: (ticket: Ticket, newStatus: TicketStatus, columnId?: string) => void;
  onChangeTicketPriority?: (ticket: Ticket, newPriority: TicketPriority) => void;
  onAssignTicket?: (ticket: Ticket, userId: string | null) => void;
  onDuplicateTicket?: (ticket: Ticket) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
}

export function Column({
  column,
  tickets,
  members = [],
  columns = [],
  canManageColumns = false,
  canCreateTicket = true,
  isFirst = false,
  isLast = false,
  isCompact = false,
  onTicketClick,
  onAddTicketClick,
  onRenameColumn,
  onEditColumn,
  onConfigureWip,
  onDuplicateColumn,
  onDeleteColumn,
  onMoveColumnLeft,
  onMoveColumnRight,
  onToggleCollapse,
  onEditTicketTitle,
  onChangeTicketStatus,
  onChangeTicketPriority,
  onAssignTicket,
  onDuplicateTicket,
  onDeleteTicket,
}: ColumnProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(column.name);
  const menuRef = useRef<HTMLDivElement>(null);

  // Column Sortable hook for column drag-and-drop reordering
  const {
    attributes: colAttributes,
    listeners: colListeners,
    setNodeRef: setColNodeRef,
    transform: colTransform,
    transition: colTransition,
    isDragging: isColDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  // Droppable hook for cards dropped into this column
  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      columnId: column.id,
      category: column.category,
    },
  });

  const colStyle = {
    transform: CSS.Transform.toString(colTransform),
    transition: colTransition,
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSaveTitle = () => {
    if (tempTitle.trim() && tempTitle.trim() !== column.name) {
      if (onRenameColumn) {
        onRenameColumn(column, tempTitle.trim());
      }
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = () => {
    setTempTitle(column.name);
    setIsEditingTitle(false);
  };

  const wipLimit = column.wipLimit ?? 0;
  const isWipExceeded = wipLimit > 0 && tickets.length > wipLimit;

  // Collapsed column rendering
  if (column.isCollapsed) {
    return (
      <div
        ref={setColNodeRef}
        style={colStyle}
        className="w-12 min-w-12 max-w-12 h-[600px] flex flex-col items-center py-4 bg-slate-100/80 rounded-xl border border-slate-200/80 flex-shrink-0 shadow-sm transition-all select-none group"
      >
        <button
          type="button"
          onClick={() => onToggleCollapse && onToggleCollapse(column)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors mb-4"
          title={`Expand ${column.name} column`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center mb-4">
          {tickets.length}
        </span>

        <div className="flex-1 flex items-center justify-center">
          <span
            className="transform -rotate-90 whitespace-nowrap text-xs font-bold text-slate-600 uppercase tracking-wider"
            style={{ width: 'max-content' }}
          >
            {column.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setColNodeRef}
      style={colStyle}
      className={`w-[316px] min-w-[316px] max-w-[320px] flex flex-col rounded-xl p-3 shadow-sm transition-all flex-shrink-0 select-none ${
        isColDragging
          ? 'opacity-40 border-2 border-primary bg-indigo-50/50'
          : isWipExceeded
          ? 'bg-rose-50/40 border border-rose-200/80 shadow-md'
          : 'bg-slate-100/90 border border-slate-200/70 hover:border-slate-300'
      }`}
    >
      {/* Column Header */}
      <div className="h-8 flex items-center justify-between mb-2 px-1 group">
        {/* Left: Drag Handle, Title, and Count */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Column Drag Handle */}
          <button
            type="button"
            {...colAttributes}
            {...colListeners}
            className="text-slate-400 opacity-40 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:text-slate-700 transition-opacity p-0.5 rounded"
            title="Drag to reorder column"
            aria-label="Drag column"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Column Color indicator */}
          {column.color && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: column.color }}
            />
          )}

          {/* Column Title: either inline edit or text */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={tempTitle}
                autoFocus
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelTitle();
                }}
                className="w-full px-1.5 py-0.5 text-xs font-bold text-slate-900 bg-white border border-primary rounded focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleCancelTitle}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 min-w-0 cursor-text"
              onDoubleClick={() => canManageColumns && setIsEditingTitle(true)}
              title={canManageColumns ? 'Double-click to rename' : undefined}
            >
              <h3
                className={`font-bold text-[13px] uppercase tracking-wide truncate ${
                  isWipExceeded ? 'text-red-700' : 'text-slate-800'
                }`}
              >
                {column.name}
              </h3>
            </div>
          )}

          {/* Ticket Count Badge */}
          <span
            className={`w-5 h-5 rounded-full text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 ${
              isWipExceeded
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {tickets.length}
          </span>
        </div>

        {/* Right Header Controls: WIP Badge, Add Button, Context Menu */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* WIP Badge (only shown when a limit is configured) */}
          {wipLimit > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-tight ${
                isWipExceeded
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
              title={`WIP Limit: ${tickets.length}/${wipLimit}`}
            >
              WIP: {tickets.length}/{wipLimit} {isWipExceeded && '!'}
            </span>
          )}

          {/* Quick Add Ticket to this column */}
          {canCreateTicket && (
            <button
              type="button"
              onClick={() => onAddTicketClick(column)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title={`Add ticket to ${column.name}`}
              aria-label={`Add ticket to ${column.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Column Context Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Column options"
              aria-label="Column options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-7 w-48 rounded-xl bg-white border border-slate-200 shadow-dropdown p-1.5 z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Quick Add Ticket */}
                {canCreateTicket && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onAddTicketClick(column);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Add Ticket</span>
                  </button>
                )}

                {canManageColumns && (
                  <>
                    {/* Rename inline */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setIsEditingTitle(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>Rename Column</span>
                    </button>

                    {/* Move Left */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => {
                        setMenuOpen(false);
                        if (onMoveColumnLeft) onMoveColumnLeft(column);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-left font-medium transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                      <span>Move Left</span>
                    </button>

                    {/* Move Right */}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => {
                        setMenuOpen(false);
                        if (onMoveColumnRight) onMoveColumnRight(column);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-left font-medium transition-colors"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                      <span>Move Right</span>
                    </button>

                    {/* Configure WIP Limit */}
                    {onConfigureWip && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onConfigureWip(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium transition-colors"
                      >
                        <Sliders className="h-3.5 w-3.5 text-slate-500" />
                        <span>Configure WIP Limit</span>
                      </button>
                    )}

                    {/* Duplicate Column */}
                    {onDuplicateColumn && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDuplicateColumn(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Duplicate Column</span>
                      </button>
                    )}

                    {/* Collapse Column */}
                    {onToggleCollapse && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onToggleCollapse(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-left font-medium transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
                        <span>Collapse Column</span>
                      </button>
                    )}

                    {/* Delete Column */}
                    {onDeleteColumn && (
                      <>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onDeleteColumn(column);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-left font-medium text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          <span>Delete Column</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WIP Limit Exceeded Warning Banner */}
      {isWipExceeded && (
        <div className="mb-2.5 p-2 rounded-xl bg-red-100 border border-red-200/80 text-red-900 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
            <span>WIP limit exceeded ({wipLimit} max)</span>
          </div>
          {onConfigureWip && (
            <button
              type="button"
              onClick={() => onConfigureWip(column)}
              className="text-[11px] font-mono font-bold text-red-700 underline hover:text-red-900"
            >
              Details
            </button>
          )}
        </div>
      )}

      {/* Droppable Task Card Stack Container */}
      <div
        ref={setDropNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-[140px] rounded-lg transition-colors ${
          isOver ? 'bg-primary-subtle/30 ring-1 ring-primary/30 p-1' : ''
        }`}
      >
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              members={members}
              columns={columns}
              isCompact={isCompact}
              onClick={() => onTicketClick(ticket)}
              onEditTitle={onEditTicketTitle}
              onEditDetails={onTicketClick}
              onChangeStatus={onChangeTicketStatus}
              onChangePriority={onChangeTicketPriority}
              onAssign={onAssignTicket}
              onDuplicate={onDuplicateTicket}
              onDelete={onDeleteTicket}
            />
          ))}
        </SortableContext>

        {/* Drop Target Indicator when dragging over */}
        {isOver && (
          <div className="h-11 rounded-xl bg-indigo-50 border-2 border-dashed border-indigo-300 flex items-center justify-center gap-1.5 text-indigo-700 font-mono text-xs font-semibold shadow-inner my-1 animate-pulse">
            <ArrowDown className="h-3.5 w-3.5" />
            <span>Drop card here</span>
          </div>
        )}

        {/* Empty Column Placeholder */}
        {tickets.length === 0 && !isOver && (
          <button
            type="button"
            onClick={() => canCreateTicket && onAddTicketClick(column)}
            className="h-16 w-full rounded-xl border border-dashed border-slate-200/90 hover:border-slate-300 bg-white/40 hover:bg-white/70 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer group"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add ticket</span>
          </button>
        )}
      </div>
    </div>
  );
}
