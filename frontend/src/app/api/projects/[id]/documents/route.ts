import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';
import { validateFile, processDocumentRecord } from '@/lib/documents';

// GET /api/projects/[id]/documents
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const userRole = await getProjectRole(projectId, user.id);
    if (!userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You are not a member of this project.' },
        { status: 403 }
      );
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

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    console.error('[GET /api/projects/[id]/documents] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/documents (multipart upload)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const userRole = await getProjectRole(projectId, user.id);
    if (!userRole || userRole === 'editor') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Editors cannot upload project documents.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      // Check single 'file' fallback
      const singleFile = formData.get('file') as File;
      if (singleFile) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided in upload request.' },
        { status: 400 }
      );
    }

    const uploadedDocuments = [];
    const errors: Array<{ filename: string; error: string }> = [];

    for (const file of files) {
      const filename = file.name;
      const size = file.size;
      const mimeType = file.type || 'application/octet-stream';

      // 1. Validation
      const validation = validateFile(filename, mimeType, size);
      if (!validation.valid) {
        errors.push({ filename, error: validation.error! });
        continue;
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // 2. Create Document record in database
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

      // 3. Process Document
      try {
        await processDocumentRecord(doc.id, fileBuffer);
        const processedDoc = await prisma.projectDocument.findUnique({
          where: { id: doc.id },
          include: { _count: { select: { chunks: true } } },
        });
        uploadedDocuments.push(processedDoc);
      } catch (procErr: any) {
        console.error(`Failed to process document ${filename}:`, procErr);
        errors.push({
          filename,
          error: procErr.message || 'Processing failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[POST /api/projects/[id]/documents] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process document upload' },
      { status: 500 }
    );
  }
}
