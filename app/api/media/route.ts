import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { messages, chats, evolutionInstances } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTeamForUser } from '@/lib/db/queries';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';

function getExtensionFromMimetype(mimetype: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/webm': 'webm',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
    'audio/opus': 'ogg', 'audio/webm': 'webm',
    'application/pdf': 'pdf',
  };
  return map[mimetype.split(';')[0].trim()] || mimetype.split('/')[1]?.split(';')[0] || 'bin';
}

/**
 * GET /api/media?msgId=xxx
 * Fetches media for a message using Evolution API's getBase64FromMediaMessage endpoint.
 * Caches the result locally and updates the DB for future requests.
 */
export async function GET(request: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const msgId = request.nextUrl.searchParams.get('msgId');
    if (!msgId) return NextResponse.json({ error: 'msgId is required' }, { status: 400 });

    // Look up message
    const msg = await db.query.messages.findFirst({
      where: eq(messages.id, msgId),
      columns: { id: true, chatId: true, mediaUrl: true, mediaMimetype: true, messageType: true, fromMe: true },
    });

    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // If local file already exists, serve it directly
    if (msg.mediaUrl && msg.mediaUrl.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'public', msg.mediaUrl);
      try {
        await fs.access(localPath);
        return NextResponse.redirect(new URL(msg.mediaUrl, request.url));
      } catch {
        // File missing locally — fall through to re-fetch
      }
    }

    // Get chat remoteJid + instance credentials
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, msg.chatId),
      columns: { remoteJid: true, instanceId: true },
    });

    if (!chat?.instanceId) return NextResponse.json({ error: 'Instance not found' }, { status: 404 });

    const instance = await db.query.evolutionInstances.findFirst({
      where: eq(evolutionInstances.id, chat.instanceId),
      columns: { instanceName: true, accessToken: true },
    });

    if (!instance?.accessToken) return NextResponse.json({ error: 'No API key configured' }, { status: 503 });

    // Ask Evolution API to download + decrypt the media via Baileys
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/getBase64FromMediaMessage/${instance.instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.accessToken,
        },
        body: JSON.stringify({
          message: {
            key: {
              id: msgId,
              fromMe: msg.fromMe ?? false,
              remoteJid: chat.remoteJid,
            },
          },
        }),
      }
    );

    if (!res.ok) {
      console.error('[media proxy] Evolution API error:', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ error: 'Media not available' }, { status: 404 });
    }

    const data = await res.json();
    const b64Raw: string | undefined = data.base64 || data.data?.base64;
    const mimetype: string = data.mimetype || data.data?.mimetype || msg.mediaMimetype || 'application/octet-stream';

    if (!b64Raw) {
      return NextResponse.json({ error: 'No base64 in Evolution API response' }, { status: 404 });
    }

    const b64 = b64Raw.startsWith('data:') ? b64Raw.split(',')[1] : b64Raw;
    const buffer = Buffer.from(b64, 'base64');

    // Cache locally
    try {
      const ext = getExtensionFromMimetype(mimetype);
      const subDir = (msg.messageType || 'image').replace('Message', '').toLowerCase();
      const filename = `${Date.now()}-${uuidv4()}.${ext}`;
      const relativeDirPath = `uploads/${subDir}`;
      const absDir = path.join(process.cwd(), 'public', relativeDirPath);
      await fs.mkdir(absDir, { recursive: true });
      await fs.writeFile(path.join(absDir, filename), buffer);

      const localUrl = `/${relativeDirPath}/${filename}`;
      await db
        .update(messages)
        .set({ mediaUrl: localUrl, mediaMimetype: mimetype })
        .where(eq(messages.id, msgId));
    } catch (cacheErr: any) {
      console.warn('[media proxy] cache write failed:', cacheErr.message);
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimetype,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[media proxy]', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
