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
  Settings,
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
  onChangeColor?: (column: BoardColumn, color: string) => void;
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
  onChangeColor,
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
  const isWipAtLimit = wipLimit > 0 && tickets.length >= wipLimit && !isWipExceeded;

  // Collapsed column rendering
  if (column.isCollapsed) {
    return (
      <div
        ref={setColNodeRef}
        style={colStyle}
        {...colAttributes}
        {...colListeners}
        className="w-12 min-w-12 max-w-12 h-[600px] flex flex-col items-center py-4 bg-surface/80 rounded-xl border border-border/70 flex-shrink-0 shadow-sm transition-all select-none group cursor-grab active:cursor-grabbing"
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse && onToggleCollapse(column);
          }}
          className="p-1 rounded-lg text-tm hover:text-tp hover:bg-elevated transition-colors mb-4"
          title={`Expand ${column.name} column`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-elevated text-ts font-medium mb-4">
          {tickets.length}
        </span>

        <div className="flex-1 flex items-center justify-center">
          <span
            className="transform -rotate-90 whitespace-nowrap text-xs font-semibold text-ts uppercase tracking-wide"
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
      className={`w-[290px] shrink-0 h-full max-h-full flex flex-col rounded-xl bg-surface border shadow-sm transition-all select-none ${
        isColDragging
          ? 'opacity-40 border-2 border-accent bg-accent-subtle/50'
          : isWipExceeded
          ? 'border-danger/35 shadow-md'
          : 'border-border/70 hover:border-border'
      }`}
    >
      {/* Column Header */}
      <div
        {...colAttributes}
        {...colListeners}
        className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 shrink-0 group cursor-grab active:cursor-grabbing"
        title="Drag header to reorder column"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="text-tm opacity-0 group-hover:opacity-70 hover:opacity-100 hover:text-tp transition-opacity p-0.5 rounded flex-shrink-0"
            aria-label="Drag column"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>

          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${column.color ? '' : 'bg-ts'}`}
            style={column.color ? { backgroundColor: column.color } : undefined}
            aria-hidden
          />

          {isEditingTitle ? (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 flex-1 min-w-0"
            >
              <input
                type="text"
                value={tempTitle}
                autoFocus
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelTitle();
                }}
                className="w-full px-1.5 py-0.5 text-xs font-semibold text-tp bg-elevated border border-accent rounded focus:outline-none uppercase"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-success hover:bg-success-subtle rounded"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleCancelTitle}
                className="p-1 text-tm hover:bg-elevated rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 min-w-0 flex-wrap"
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (canManageColumns) setIsEditingTitle(true);
              }}
              title={canManageColumns ? 'Double-click to rename' : undefined}
            >
              <h2
                className={`text-xs font-semibold uppercase tracking-wide truncate ${
                  isWipExceeded ? 'text-danger' : 'text-tp'
                }`}
              >
                {column.name}
              </h2>
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded bg-elevated font-medium flex-shrink-0 ${
                  isWipExceeded ? 'text-danger' : 'text-ts'
                }`}
              >
                {tickets.length}
              </span>
              {wipLimit > 0 && (
                <span
                  className={`text-[10px] font-mono flex-shrink-0 ${
                    isWipExceeded
                      ? 'px-1 py-0.5 rounded bg-danger-subtle text-danger font-medium border border-danger/30'
                      : isWipAtLimit
                      ? 'px-1 py-0.5 rounded bg-accent/20 text-accent font-medium'
                      : 'text-ts'
                  }`}
                  title={`WIP Limit: ${tickets.length}/${wipLimit}`}
                >
                  {isWipExceeded || isWipAtLimit
                    ? `WIP: ${tickets.length}/${wipLimit}`
                    : `WIP: ${wipLimit}`}
                </span>
              )}
            </div>
          )}
        </div>

        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 flex-shrink-0"
        >
          {canCreateTicket && (
            <button
              type="button"
              onClick={() => onAddTicketClick(column)}
              className="w-6 h-6 rounded hover:bg-elevated text-ts hover:text-tp flex items-center justify-center transition-colors"
              title={`Add ticket to ${column.name}`}
              aria-label={`Add ticket to ${column.name}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-6 h-6 rounded hover:bg-elevated text-ts hover:text-tp flex items-center justify-center transition-colors"
              title="Column options"
              aria-label="Column options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-7 w-48 rounded-xl bg-elevated border border-border shadow-dropdown p-1.5 z-50 text-xs text-ts animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                {canCreateTicket && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onAddTicketClick(column);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-tm" />
                    <span>Add Ticket</span>
                  </button>
                )}

                {canManageColumns && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setIsEditingTitle(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-tm" />
                      <span>Rename Column</span>
                    </button>

                    {onEditColumn && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onEditColumn(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5 text-tm" />
                        <span>Column Settings</span>
                      </button>
                    )}

                    {onChangeColor && (
                      <div className="px-2.5 py-1.5 border-t border-divider my-1">
                        <span className="text-[10px] font-semibold text-tm uppercase tracking-wider block mb-1.5">
                          Column Color
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {['#88A9FF', '#5DBA9D', '#D8B36A', '#D98287', '#A2BBFF', '#95A3B5', '#687789', '#273342'].map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setMenuOpen(false);
                                onChangeColor(column, color);
                              }}
                              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                                column.color === color ? 'border-border ring-2 ring-accent/30 scale-105' : 'border-border shadow-2xs'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => {
                        setMenuOpen(false);
                        if (onMoveColumnLeft) onMoveColumnLeft(column);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover disabled:opacity-30 disabled:pointer-events-none text-left font-medium transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-tm" />
                      <span>Move Left</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => {
                        setMenuOpen(false);
                        if (onMoveColumnRight) onMoveColumnRight(column);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover disabled:opacity-30 disabled:pointer-events-none text-left font-medium transition-colors"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-tm" />
                      <span>Move Right</span>
                    </button>

                    {onConfigureWip && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onConfigureWip(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                      >
                        <Sliders className="h-3.5 w-3.5 text-tm" />
                        <span>Configure WIP Limit</span>
                      </button>
                    )}

                    {onDuplicateColumn && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDuplicateColumn(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5 text-tm" />
                        <span>Duplicate Column</span>
                      </button>
                    )}

                    {onToggleCollapse && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onToggleCollapse(column);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-hover text-left font-medium transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 text-tm" />
                        <span>Collapse Column</span>
                      </button>
                    )}

                    {onDeleteColumn && (
                      <>
                        <div className="my-1 border-t border-divider" />
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onDeleteColumn(column);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-danger-subtle text-left font-medium text-danger transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
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

      {isWipExceeded && (
        <div className="mx-2.5 mt-2 p-2 rounded-lg bg-danger-subtle border border-danger/30 text-danger flex items-center justify-between text-xs shadow-xs shrink-0">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 text-danger flex-shrink-0" />
            <span>WIP limit exceeded ({wipLimit} max)</span>
          </div>
          {onConfigureWip && (
            <button
              type="button"
              onClick={() => onConfigureWip(column)}
              className="text-[11px] font-mono font-bold text-danger underline hover:text-danger/80"
            >
              Details
            </button>
          )}
        </div>
      )}

      {/* Droppable Task Card Stack */}
      <div
        ref={setDropNodeRef}
        className={`p-2.5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 min-h-[140px] transition-colors ${
          isOver ? 'bg-accent-subtle/20 ring-1 ring-inset ring-accent/20' : ''
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

        {isOver && (
          <div className="h-11 rounded-[10px] bg-accent-subtle border-2 border-dashed border-accent/40 flex items-center justify-center gap-1.5 text-accent font-mono text-xs font-semibold animate-pulse">
            <ArrowDown className="h-3.5 w-3.5" />
            <span>Drop card here</span>
          </div>
        )}

        {tickets.length === 0 && !isOver && (
          <button
            type="button"
            onClick={() => canCreateTicket && onAddTicketClick(column)}
            className="p-4 rounded-[10px] border-2 border-dashed border-border/60 text-center flex flex-col items-center justify-center gap-1 py-7 hover:border-accent/40 transition-colors text-[11px] text-tm/70 font-medium"
          >
            <Plus className="h-5 w-5 text-tm/60" />
            <span>Add ticket</span>
          </button>
        )}
      </div>

      {canCreateTicket && (
        <div className="p-2 border-t border-border/30 shrink-0">
          <button
            type="button"
            onClick={() => onAddTicketClick(column)}
            className="w-full py-1.5 px-2 rounded-lg text-ts hover:text-tp hover:bg-elevated/80 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add task</span>
          </button>
        </div>
      )}
    </div>
  );
}
