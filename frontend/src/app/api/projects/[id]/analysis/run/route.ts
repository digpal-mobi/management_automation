import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { getProjectRole } from '@/lib/permissions';
import { analyzeProjectContext } from '@/lib/ai';
import { TicketPriority, FeatureReviewStatus } from '@prisma/client';

const priorityEnumMap: Record<string, TicketPriority> = {
  Low: TicketPriority.LOW,
  Medium: TicketPriority.MEDIUM,
  High: TicketPriority.HIGH,
  Critical: TicketPriority.CRITICAL,
};

// POST /api/projects/[id]/analysis/run
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
    if (userRole !== 'owner' && userRole !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only owners and managers can run project analysis.' },
        { status: 403 }
      );
    }

    // 1. Run AI analysis pipeline
    const output = await analyzeProjectContext(projectId);

    // 2. Upsert ProjectAnalysis record
    const analysis = await prisma.projectAnalysis.upsert({
      where: { projectId },
      create: {
        projectId,
        overview: output.overview,
        functionalRequirements: output.functionalRequirements as any,
        nonFunctionalRequirements: output.nonFunctionalRequirements as any,
        businessRules: output.businessRules as any,
        technicalRequirements: output.technicalRequirements as any,
        milestones: output.milestones as any,
        openQuestions: output.openQuestions as any,
        status: 'COMPLETED',
        analyzedAt: new Date(),
      },
      update: {
        overview: output.overview,
        functionalRequirements: output.functionalRequirements as any,
        nonFunctionalRequirements: output.nonFunctionalRequirements as any,
        businessRules: output.businessRules as any,
        technicalRequirements: output.technicalRequirements as any,
        milestones: output.milestones as any,
        openQuestions: output.openQuestions as any,
        status: 'COMPLETED',
        analyzedAt: new Date(),
      },
    });

    // 3. Synchronize proposed features into ProjectFeature table
    // Preserve existing features that PM has reviewed (ACCEPTED or DEFERRED)
    const existingFeatures = await prisma.projectFeature.findMany({
      where: { projectId },
    });

    const existingNamesMap = new Map(existingFeatures.map((f) => [f.name.toLowerCase().trim(), f]));

    let orderCounter = existingFeatures.length;

    for (const f of output.features) {
      const normalizedName = f.name.toLowerCase().trim();
      const existing = existingNamesMap.get(normalizedName);

      if (existing) {
        // If PM previously accepted or deferred, preserve their status!
        if (existing.status === 'ACCEPTED' || existing.status === 'DEFERRED') {
          continue;
        }

        // Update proposed feature content
        await prisma.projectFeature.update({
          where: { id: existing.id },
          data: {
            description: f.description,
            module: f.module || existing.module,
            businessValue: f.businessValue || existing.businessValue,
            relatedRequirements: f.relatedRequirements as any,
            dependencies: f.dependencies as any,
            constraints: f.constraints || existing.constraints,
            sourceReferences: f.sourceReferences as any,
            suggestedPriority: priorityEnumMap[f.suggestedPriority] || TicketPriority.MEDIUM,
          },
        });
      } else {
        // Create new proposed feature
        await prisma.projectFeature.create({
          data: {
            projectId,
            name: f.name,
            description: f.description,
            module: f.module || 'Core Architecture',
            businessValue: f.businessValue || null,
            relatedRequirements: f.relatedRequirements as any,
            dependencies: f.dependencies as any,
            suggestedPriority: priorityEnumMap[f.suggestedPriority] || TicketPriority.MEDIUM,
            constraints: f.constraints || null,
            sourceReferences: f.sourceReferences as any,
            status: FeatureReviewStatus.PROPOSED,
            isAiGenerated: true,
            order: orderCounter++,
          },
        });
      }
    }

    // Fetch updated features list
    const features = await prisma.projectFeature.findMany({
      where: { projectId },
      orderBy: [{ module: 'asc' }, { order: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      analysis,
      features,
      message: 'Project analysis completed and roadmap synchronized.',
    });
  } catch (error: any) {
    console.error('[POST /api/projects/[id]/analysis/run] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run project analysis' },
      { status: 500 }
    );
  }
}
