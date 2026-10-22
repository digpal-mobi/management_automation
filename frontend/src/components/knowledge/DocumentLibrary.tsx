'use client';

import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ProjectDocument } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCheck,
  AlertTriangle,
  RotateCw,
  Trash2,
  CheckCircle2,
  Loader2,
  HelpCircle,
  File,
} from 'lucide-react';

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

  // File Upload Handler
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!canEdit) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
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
        throw new Error(data.error || 'Failed to remove document');
      }
      toast.success('Document removed.');
      onDocumentsChange();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeletingDocId(null);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 text-white" />;
      case 'pdf':
      case 'docx':
        return <FileText className="h-4 w-4 text-white" />;
      case 'md':
      case 'txt':
        return <FileCheck className="h-4 w-4 text-white" />;
      default:
        return <File className="h-4 w-4 text-white" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Drop Zone */}
      {canEdit && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 ${
            isDragging
              ? 'border-white bg-[#141414]'
              : 'border-[#2A2A2A] hover:border-[#404040] bg-[#0A0A0A] hover:bg-[#101010]'
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
            <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center mx-auto text-white">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="h-5 w-5" />
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-white">
                {isUploading ? 'Parsing & Ingesting Documents...' : 'Upload Requirements & PRDs'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Drag and drop files here, or click to browse from your computer
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {['.PDF', '.DOCX', '.MD', '.TXT', '.XLSX', '.CSV'].map((ext) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 rounded bg-[#141414] border border-[#2A2A2A] text-[10px] font-mono text-neutral-300"
                >
                  {ext}
                </span>
              ))}
              <span className="text-[10px] text-neutral-500 ml-1">Up to 20MB per file</span>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-white" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Project Documents ({documents.length})
            </h3>
          </div>
          <span className="text-[11px] text-neutral-500">
            Grounding context for AI analysis & roadmap
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center mx-auto text-neutral-500">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-neutral-300">No documents uploaded yet</p>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
              Upload formal PRDs, architecture specifications, requirement matrices (.csv/.xlsx), or sprint notes to train the project context.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {documents.map((doc) => {
              const sizeKb = Math.round(doc.fileSize / 1024);
              const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
              const isRetrying = retryingDocId === doc.id;
              const isDeleting = deletingDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#101010] transition-colors"
                >
                  {/* Document Meta */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2A2A2A] flex items-center justify-center shrink-0 mt-0.5">
                      {getFormatIcon(doc.fileFormat)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white">
                          {doc.filename}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase bg-[#141414] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                          {doc.fileFormat}
                        </span>
                        <Badge variant="docStatus" docStatus={doc.status} size="sm" />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                        <span>{sizeStr}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        {doc.metadata?.pageCount && (
                          <>
                            <span>•</span>
                            <span>{doc.metadata.pageCount} pages</span>
                          </>
                        )}
                        {doc.metadata?.wordCount && (
                          <>
                            <span>•</span>
                            <span>{doc.metadata.wordCount} words</span>
                          </>
                        )}
                      </div>

                      {doc.errorMessage && (
                        <div className="mt-1 text-[11px] text-neutral-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-white" />
                          <span>{doc.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {doc.status === 'FAILED' && canEdit && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isRetrying}
                        onClick={() => handleRetry(doc.id)}
                        className="text-[11px] h-7 px-2.5"
                      >
                        <RotateCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                        Retry
                      </Button>
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#141414] border border-transparent hover:border-[#2A2A2A] transition-colors"
                        title="Remove document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
