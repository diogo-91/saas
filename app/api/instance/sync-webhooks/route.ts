import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { evolutionInstances } from '@/lib/db/schema';
import { getTeamForUser } from '@/lib/db/queries';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const MASTER_API_KEY = process.env.AUTHENTICATION_API_KEY;
const YOUR_PUBLIC_WEBHOOK_URL = process.env.NEXT_PUBLIC_EVOLUTION_WEBHOOK_URL
  || (process.env.NEXT_PUBLIC_WEBHOOK_URL ? `${process.env.NEXT_PUBLIC_WEBHOOK_URL}/api/webhook/evolution` : undefined);

const WEBHOOK_EVENTS = [
  'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CHATS_UPDATE',
  'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'CONTACTS_UPDATE',
];

/**
 * POST /api/instance/sync-webhooks
 * Updates all instances' webhook configuration to point to our app with base64: true.
 */
export async function POST() {
  try {
    const team = await getTeamForUser();
    if (!team) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!YOUR_PUBLIC_WEBHOOK_URL) {
      return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
    }

    const instances = await db.query.evolutionInstances.findMany({
      columns: { instanceName: true, accessToken: true },
    });

    const results: { instanceName: string; status: string; error?: string }[] = [];

    for (const instance of instances) {
      const apiKey = instance.accessToken || MASTER_API_KEY;
      if (!apiKey) {
        results.push({ instanceName: instance.instanceName, status: 'skipped', error: 'no apikey' });
        continue;
      }

      try {
        const res = await fetch(
          `${EVOLUTION_API_URL}/webhook/set/${instance.instanceName}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
            },
            body: JSON.stringify({
              url: YOUR_PUBLIC_WEBHOOK_URL,
              enabled: true,
              base64: true,
              byEvents: false,
              events: WEBHOOK_EVENTS,
            }),
          }
        );

        const data = await res.json().catch(() => ({}));
        results.push({
          instanceName: instance.instanceName,
          status: res.ok ? 'updated' : 'error',
          error: res.ok ? undefined : JSON.stringify(data),
        });
      } catch (err: any) {
        results.push({ instanceName: instance.instanceName, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
