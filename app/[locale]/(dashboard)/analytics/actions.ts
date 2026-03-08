'use server';

import { db } from '@/lib/db/drizzle';
import { contacts, funnelStages, users, messages } from '@/lib/db/schema';
import { sql, eq, and, gte } from 'drizzle-orm';

export async function getDashboardStats(teamId: number) {
  // ── Funil: contagem de contatos por etapa ─────────────────────────────
  // Retorna: { name: string, value: number }[]
  const funnelMetrics = await db
    .select({
      name: funnelStages.name,
      value: sql<number>`count(${contacts.id})`.mapWith(Number),
    })
    .from(funnelStages)
    .leftJoin(contacts, eq(contacts.funnelStageId, funnelStages.id))
    .where(eq(funnelStages.teamId, teamId))
    .groupBy(funnelStages.name, funnelStages.order)
    .orderBy(funnelStages.order);

  // ── Atendentes: contagem de contatos por agente ───────────────────────
  // Retorna: { name: string, total: number, funnels: Record<string, number> }[]
  const rawAgentMetrics = await db
    .select({
      agentName: users.name,
      funnelName: funnelStages.name,
      count: sql<number>`count(${contacts.id})`.mapWith(Number),
    })
    .from(contacts)
    .leftJoin(users, eq(contacts.assignedUserId, users.id))
    .leftJoin(funnelStages, eq(contacts.funnelStageId, funnelStages.id))
    .where(eq(contacts.teamId, teamId))
    .groupBy(users.name, funnelStages.name);

  const agentMap = new Map<string, { name: string; total: number; funnels: Record<string, number> }>();

  rawAgentMetrics.forEach((row) => {
    const name = row.agentName || 'Não atribuído';
    if (!agentMap.has(name)) {
      agentMap.set(name, { name, total: 0, funnels: {} });
    }
    const agent = agentMap.get(name)!;
    agent.total += row.count;
    const fName = row.funnelName || 'Sem Etapa';
    agent.funnels[fName] = (agent.funnels[fName] || 0) + row.count;
  });

  const agentMetrics = Array.from(agentMap.values()).sort((a, b) => b.total - a.total);

  // ── Tráfego: mensagens agrupadas por dia-da-semana + hora ─────────────
  // Retorna: { day: number (0=Dom..6=Sáb), hour: number (0-23), count: number }[]
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  const rawTraffic = await db
    .select({
      day:   sql<number>`EXTRACT(DOW  FROM ${messages.timestamp})`.mapWith(Number),
      hour:  sql<number>`EXTRACT(HOUR FROM ${messages.timestamp})`.mapWith(Number),
      count: sql<number>`count(${messages.id})`.mapWith(Number),
    })
    .from(messages)
    .innerJoin(contacts, eq(messages.chatId, contacts.chatId))
    .where(
      and(
        eq(contacts.teamId, teamId),
        gte(messages.timestamp, startDate)
      )
    )
    .groupBy(
      sql`EXTRACT(DOW  FROM ${messages.timestamp})`,
      sql`EXTRACT(HOUR FROM ${messages.timestamp})`
    );

  // trafficMetrics: apenas células com dados (células vazias ficam em 0 no componente)
  const trafficMetrics = rawTraffic.map((t) => ({
    day:   t.day,
    hour:  t.hour,
    count: t.count,
  }));

  return {
    funnelMetrics,
    agentMetrics,
    trafficMetrics,
  };
}
