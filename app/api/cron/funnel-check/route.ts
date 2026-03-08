/**
 * GET /api/cron/funnel-check
 *
 * Runs funnel stage transitions that are time-based:
 *   - Contacts in "Novo" or "Em qualificação" with no customer interaction
 *     for more than 5 hours → move to "Não agendado"
 *
 * Call this endpoint every 30–60 minutes via an external cron service
 * (e.g. Vercel Cron, n8n, GitHub Actions, cron-job.org).
 *
 * Secured with CRON_SECRET env variable.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { contacts, funnelStages, chats } from '@/lib/db/schema';
import { eq, and, lte, inArray, isNotNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const INACTIVITY_HOURS = 5;

export async function GET(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const cutoff = new Date(Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000);
  let movedToNotScheduled = 0;

  try {
    // ── Get all teams that have funnel stages ────────────────────────────
    const allStages = await db.query.funnelStages.findMany({
      columns: { id: true, name: true, teamId: true },
    });

    // Group stages by teamId
    const stagesByTeam = new Map<number, { id: number; name: string }[]>();
    for (const s of allStages) {
      if (!stagesByTeam.has(s.teamId)) stagesByTeam.set(s.teamId, []);
      stagesByTeam.get(s.teamId)!.push({ id: s.id, name: s.name });
    }

    for (const [teamId, stages] of stagesByTeam) {
      const stageByName: Record<string, number> = {};
      for (const s of stages) stageByName[s.name] = s.id;

      const notScheduledId = stageByName['Não agendado'];
      const novoId        = stageByName['Novo'];
      const qualId        = stageByName['Em qualificação'];

      if (!notScheduledId) continue;

      const earlyStageIds = [novoId, qualId].filter(Boolean) as number[];
      if (earlyStageIds.length === 0) continue;

      // Find contacts in early stages whose chat has been inactive > 5h
      const staleContacts = await db
        .select({ contactId: contacts.id, chatId: contacts.chatId })
        .from(contacts)
        .innerJoin(chats, eq(chats.id, contacts.chatId))
        .where(
          and(
            eq(contacts.teamId, teamId),
            inArray(contacts.funnelStageId, earlyStageIds),
            // lastCustomerInteraction: last time the customer sent a message
            isNotNull(chats.lastCustomerInteraction),
            lte(chats.lastCustomerInteraction, cutoff),
          )
        );

      if (staleContacts.length === 0) continue;

      const ids = staleContacts.map((c) => c.contactId);
      await db
        .update(contacts)
        .set({ funnelStageId: notScheduledId, updatedAt: new Date() })
        .where(inArray(contacts.id, ids));

      movedToNotScheduled += staleContacts.length;
    }

    return NextResponse.json({
      ok: true,
      movedToNotScheduled,
      checkedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[cron/funnel-check] error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
