import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';
import { parseDocumentBuffer } from '@/lib/documents';

// POST /api/projects/[id]/documents/[docId]/retry
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, docId } = params;
    const userRole = await getProjectRole(projectId, user.id);
    if (!userRole || userRole === 'editor') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Editors cannot retry document processing.' },
        { status: 403 }
      );
    }

    const doc = await prisma.projectDocument.findFirst({
      where: { id: docId, projectId },
    });

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // If extractedText already exists, regenerate chunks
    if (doc.extractedText) {
      await prisma.projectDocument.update({
        where: { id: docId },
        data: { status: 'PROCESSING', errorMessage: null },
      });

      const buffer = Buffer.from(doc.extractedText, 'utf-8');
      const result = await parseDocumentBuffer(buffer, doc.fileFormat === 'md' ? 'md' : 'txt');

      await prisma.documentChunk.deleteMany({
        where: { documentId: docId },
      });

      if (result.chunks.length > 0) {
        await prisma.documentChunk.createMany({
          data: result.chunks.map((c) => ({
            documentId: docId,
            projectId,
            chunkText: c.chunkText,
            location: c.location || null,
            sourceHeading: c.sourceHeading || null,
            order: c.order,
          })),
        });
      }

      const updated = await prisma.projectDocument.update({
        where: { id: docId },
        data: { status: 'COMPLETED', errorMessage: null },
      });

      return NextResponse.json({ success: true, document: updated });
    }

    // If no text was saved, reset to PENDING so PM can re-upload
    const updated = await prisma.projectDocument.update({
      where: { id: docId },
      data: { status: 'PENDING', errorMessage: null },
    });

    return NextResponse.json({
      success: true,
      document: updated,
      message: 'Document status reset to pending. Please re-upload file to process.',
    });
  } catch (error: any) {
    console.error('[POST retry document] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retry processing' },
      { status: 500 }
    );
  }
}
