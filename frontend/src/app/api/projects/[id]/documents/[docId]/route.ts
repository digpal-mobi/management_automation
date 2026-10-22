import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';

// GET /api/projects/[id]/documents/[docId]
export async function GET(
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
    if (!userRole) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const document = await prisma.projectDocument.findFirst({
      where: { id: docId, projectId },
      include: {
        chunks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    console.error('[GET document] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/documents/[docId]
export async function DELETE(
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
    if (userRole !== 'owner' && userRole !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only owners and managers can delete documents.' },
        { status: 403 }
      );
    }

    await prisma.documentChunk.deleteMany({
      where: { documentId: docId },
    });

    await prisma.projectDocument.delete({
      where: { id: docId, projectId },
    });

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE document] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
