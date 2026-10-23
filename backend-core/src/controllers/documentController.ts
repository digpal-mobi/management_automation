import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateRequest } from '../lib/auth.js';
import { getProjectRole } from '../lib/permissions.js';
import { validateFile, processDocumentRecord } from '../lib/documents.js';

export class DocumentController {
  static async getDocuments(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
      }

      const documents = await prisma.projectDocument.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { chunks: true },
          },
        },
      });

      return res.status(200).json({ success: true, documents });
    } catch (error: any) {
      console.error('[DocumentController.getDocuments] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch documents' });
    }
  }

  static async uploadDocuments(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole || userRole === 'editor') {
        return res.status(403).json({ success: false, error: 'Forbidden. Editors cannot upload project documents.' });
      }

      const reqFiles = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      if (!reqFiles || reqFiles.length === 0) {
        return res.status(400).json({ success: false, error: 'No files provided in upload request.' });
      }

      const uploadedDocuments = [];
      const errors: Array<{ filename: string; error: string }> = [];

      for (const file of reqFiles) {
        const filename = file.originalname;
        const size = file.size;
        const mimeType = file.mimetype || 'application/octet-stream';

        const validation = validateFile(filename, mimeType, size);
        if (!validation.valid) {
          errors.push({ filename, error: validation.error! });
          continue;
        }

        const doc = await prisma.projectDocument.create({
          data: {
            projectId,
            filename,
            fileSize: size,
            fileFormat: validation.format,
            mimeType,
            status: 'PENDING',
          },
        });

        try {
          await processDocumentRecord(doc.id, file.buffer);
          const processedDoc = await prisma.projectDocument.findUnique({
            where: { id: doc.id },
            include: { _count: { select: { chunks: true } } },
          });
          uploadedDocuments.push(processedDoc);
        } catch (procErr: any) {
          console.error(`[Upload] Processing failed for doc ${doc.id}:`, procErr);
          await prisma.projectDocument.update({
            where: { id: doc.id },
            data: {
              status: 'FAILED',
              errorMessage: procErr.message || 'Processing failed',
            },
          });
          errors.push({ filename, error: procErr.message || 'Processing failed' });
        }
      }

      return res.status(200).json({
        success: true,
        documents: uploadedDocuments,
        errors,
        totalUploaded: uploadedDocuments.length,
        totalFailed: errors.length,
      });
    } catch (error: any) {
      console.error('[DocumentController.uploadDocuments] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal upload error' });
    }
  }

  static async getDocumentById(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, docId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const document = await prisma.projectDocument.findUnique({
        where: { id: docId },
        include: {
          chunks: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!document || document.projectId !== projectId) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      return res.status(200).json({ success: true, document });
    } catch (error: any) {
      console.error('[DocumentController.getDocumentById] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch document' });
    }
  }

  static async deleteDocument(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, docId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole || userRole === 'editor') {
        return res.status(403).json({ success: false, error: 'Forbidden. Editors cannot delete documents.' });
      }

      const doc = await prisma.projectDocument.findUnique({ where: { id: docId } });
      if (!doc || doc.projectId !== projectId) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      await prisma.projectDocument.delete({ where: { id: docId } });

      return res.status(200).json({ success: true, message: 'Document deleted successfully' });
    } catch (error: any) {
      console.error('[DocumentController.deleteDocument] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to delete document' });
    }
  }

  static async retryDocument(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id: projectId, docId } = req.params;
      const userRole = await getProjectRole(projectId, user.id);
      if (!userRole || userRole === 'editor') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const doc = await prisma.projectDocument.findUnique({ where: { id: docId } });
      if (!doc || doc.projectId !== projectId) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      await prisma.projectDocument.update({
        where: { id: docId },
        data: { status: 'PENDING', errorMessage: null },
      });

      return res.status(200).json({ success: true, message: 'Document queued for retry' });
    } catch (error: any) {
      console.error('[DocumentController.retryDocument] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Retry failed' });
    }
  }
}
