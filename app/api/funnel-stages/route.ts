import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { funnelStages } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const DEFAULT_STAGES = [
  { name: 'Novo',             emoji: '🆕', order: 1 },
  { name: 'Em qualificação',  emoji: '🔍', order: 2 },
  { name: 'Agendado',         emoji: '📅', order: 3 },
  { name: 'Confirmado',       emoji: '✅', order: 4 },
  { name: 'Finalizado',       emoji: '🏆', order: 5 },
  { name: 'Não agendado',     emoji: '❌', order: 6 },
];

// Old English stage names that should be migrated automatically
const LEGACY_STAGE_NAMES = ['New', 'Negotiation', 'Won', 'Lost'];

export async function GET() {
  try {
    const team = await getTeamForUser();
    if (!team) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const stages = await db.query.funnelStages.findMany({
      where: eq(funnelStages.teamId, team.id),
      orderBy: (funnelStages, { asc }) => [asc(funnelStages.order)],
    });

    // Auto-migrate teams that still have the old English default stages
    const isLegacy =
      stages.length > 0 &&
      stages.every((s) => LEGACY_STAGE_NAMES.includes(s.name)) &&
      stages.length <= LEGACY_STAGE_NAMES.length;

    if (stages.length === 0 || isLegacy) {
      if (isLegacy) {
        // Remove old stages before inserting new ones
        await db.delete(funnelStages).where(eq(funnelStages.teamId, team.id));
      }

      const newStages = await db
        .insert(funnelStages)
        .values(DEFAULT_STAGES.map((s) => ({ ...s, teamId: team.id })))
        .returning();

      return NextResponse.json(newStages);
    }

    return NextResponse.json(stages);

  } catch (error: any) {
    console.error('Failed to fetch stages:', error.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
      const team = await getTeamForUser();
      if (!team) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
      const { name, emoji } = await request.json();
  
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  
      const existing = await db.query.funnelStages.findMany({
          where: eq(funnelStages.teamId, team.id)
      });
  
      const [newStage] = await db.insert(funnelStages)
        .values({
          teamId: team.id,
          name: name,
          emoji: emoji || '📁',
          order: existing.length + 1,
        })
        .returning();
  
      return NextResponse.json(newStage, { status: 201 });
  
    } catch (error: any) {
      return NextResponse.json({ error: 'Failed to create the stage.' }, { status: 500 });
    }
  }