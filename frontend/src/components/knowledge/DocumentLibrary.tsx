'use client';

import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ProjectDocument } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCheck,
  RotateCw,
  Trash2,
  Loader2,
  File,
  FileCode,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface DocumentLibraryProps {
  projectId: string;
  documents: ProjectDocument[];
  onDocumentsChange: () => void;
  canEdit: boolean;
}

export function DocumentLibrary({
  projectId,
  documents,
  onDocumentsChange,
  canEdit,
}: DocumentLibraryProps) {
  const { fetchWithAuth } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [retryingDocId, setRetryingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Paste PRD State
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');

  // File Upload Handler
  const handleUploadFiles = async (
    fileList: FileList | File[] | Array<{ blob: Blob; filename: string }>
  ) => {
    if (!canEdit) return;
    const files = Array.from(fileList as any);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      for (const item of files as any[]) {
        if (item && item.blob) {
          formData.append('files', item.blob, item.filename);
        } else if (item) {
          formData.append('files', item);
        }
      }

      const res = await fetchWithAuth(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload documents');
      }

      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((err: any) => {
          toast.error(`${err.filename}: ${err.error}`);
        });
      }

      if (data.documents && data.documents.length > 0) {
        toast.success(`Successfully uploaded and parsed ${data.documents.length} document(s).`);
      }

      onDocumentsChange();
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Error uploading documents');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Retry document processing
  const handleRetry = async (docId: string) => {
    try {
      setRetryingDocId(docId);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/documents/${docId}/retry`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Retry failed');
      }
      toast.success('Document re-processed successfully.');
      onDocumentsChange();
    } catch (err: any) {
      toast.error(err.message || 'Retry failed');
    } finally {
      setRetryingDocId(null);
    }
  };

  // Remove document
  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to remove "${filename}" from the project knowledge base?`)) {
      return;
    }

    try {
      setDeletingDocId(docId);
      const res = await fetchWithAuth(
        `/api/projects/${projectId}/documents/${docId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete document');
      }
      toast.success('Document removed from knowledge base.');
      onDocumentsChange();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleSavePastedDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) {
      toast.error('PRD content cannot be empty');
      return;
    }
    const cleanTitle = pasteTitle.trim() || 'Product_Requirements_Document';
    const filename = cleanTitle.endsWith('.md')
      ? cleanTitle
      : `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    const blob = new Blob([pasteContent.trim()], { type: 'text/markdown' });
    await handleUploadFiles([{ blob, filename }]);
    setIsPasteOpen(false);
    setPasteTitle('');
    setPasteContent('');
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 text-[#003049]" />;
      case 'pdf':
      case 'docx':
        return <FileText className="h-4 w-4 text-[#003049]" />;
      case 'md':
      case 'txt':
        return <FileCheck className="h-4 w-4 text-[#003049]" />;
      default:
        return <File className="h-4 w-4 text-[#003049]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Drop Zone & Actions */}
      {canEdit && (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 ${
              isDragging
                ? 'border-[#003049] bg-[#EFF5F9]'
                : 'border-[#CBD5E1] hover:border-[#003049] bg-white hover:bg-[#FDFDFE] shadow-card'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.md,.txt,.xlsx,.csv"
              className="hidden"
              onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
            />

            <div className="max-w-md mx-auto space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF5F9] border border-[#669BBC]/30 flex items-center justify-center mx-auto text-[#003049]">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UploadCloud className="h-5 w-5" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-[#17212B]">
                  {isUploading ? 'Parsing & Ingesting Documents...' : 'Upload Requirements, PDFs & PRDs'}
                </p>
                <p className="text-[11px] text-[#526174] mt-0.5">
                  Drag and drop files here, or click to browse from your computer
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {['.PDF', '.DOCX', '.MD', '.TXT', '.XLSX', '.CSV'].map((ext) => (
                  <span
                    key={ext}
                    className="px-2 py-0.5 rounded bg-[#F1F4F7] border border-[#E2E8F0] text-[10px] font-mono text-[#526174] font-medium"
                  >
                    {ext}
                  </span>
                ))}
                <span className="text-[10px] text-[#526174] ml-1">Up to 20MB per file</span>
              </div>
            </div>
          </div>

          {/* Alternative: Paste PRD Option */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-[#526174]">
              Don&apos;t have a document file? You can paste PRD text directly.
            </span>
            <Button
              variant="outline"
              size="xs"
              type="button"
              onClick={() => setIsPasteOpen(!isPasteOpen)}
              leftIcon={<FileCode className="h-3.5 w-3.5 text-[#003049]" />}
            >
              {isPasteOpen ? 'Hide PRD Editor' : 'Paste PRD / Spec Text'}
            </Button>
          </div>

          {isPasteOpen && (
            <Card className="border-[#669BBC]/40 bg-[#FDFDFE]">
              <form onSubmit={handleSavePastedDoc} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#17212B] flex items-center gap-1.5">
                    <FileCode className="h-4 w-4 text-[#003049]" />
                    <span>Paste Requirements or PRD Markdown</span>
                  </h4>
                  <span className="text-[10px] text-[#526174]">Will be indexed as a project document</span>
                </div>

                <Input
                  label="Document Title"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="e.g. System_Requirements_PRD.md"
                />

                <Textarea
                  label="PRD Content / Markdown *"
                  rows={6}
                  required
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="# Technical Requirements&#10;&#10;## Feature Overview&#10;Describe user stories, acceptance criteria, architectural constraints..."
                />

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setIsPasteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="xs"
                    isLoading={isUploading}
                    leftIcon={<Plus className="h-3 w-3" />}
                  >
                    Save & Ingest Document
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <FileText className="h-4 w-4 text-[#003049]" />
              <span>Project Documents ({documents.length})</span>
            </CardTitle>
            <span className="text-[11px] text-[#526174]">
              Grounding context for AI analysis & roadmap
            </span>
          </div>
        </CardHeader>

        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6 text-[#526174]" />}
            title="No documents uploaded yet"
            description="Upload formal PRDs, architecture specifications, requirement matrices (.csv/.xlsx), or sprint notes to train the project context."
          />
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {documents.map((doc) => {
              const isRetrying = retryingDocId === doc.id;
              const isDeleting = deletingDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8FA] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF5F9] border border-[#669BBC]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getFormatIcon(doc.fileFormat)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#17212B] truncate max-w-sm">
                          {doc.filename}
                        </span>
                        <Badge variant="docStatus" docStatus={doc.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#526174] mt-1">
                        <span>{Math.round(doc.fileSize / 1024)} KB</span>
                        {doc.chunks && doc.chunks.length > 0 && (
                          <span>• {doc.chunks.length} vector chunks</span>
                        )}
                        <span>• {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                      {doc.errorMessage && (
                        <p className="text-[11px] text-[#C1121F] mt-1 font-medium">{doc.errorMessage}</p>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      {doc.status === 'FAILED' && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleRetry(doc.id)}
                          isLoading={isRetrying}
                          leftIcon={<RotateCw className="h-3 w-3" />}
                        >
                          Retry
                        </Button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        disabled={isDeleting}
                        aria-label={`Delete ${doc.filename}`}
                        className="p-1.5 rounded-lg text-[#526174] hover:text-[#C1121F] hover:bg-[#FDF2F2] border border-transparent hover:border-[#FDE8E8] transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
