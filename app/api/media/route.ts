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
 * Fetches media for a message from Evolution API and returns it as a binary response.
 * Also caches the file locally for future requests.
 */
export async function GET(request: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const msgId = request.nextUrl.searchParams.get('msgId');
    if (!msgId) return NextResponse.json({ error: 'msgId is required' }, { status: 400 });

    // Look up message → chat → instance
    const msg = await db.query.messages.findFirst({
      where: eq(messages.id, msgId),
      columns: { id: true, chatId: true, mediaUrl: true, mediaMimetype: true, messageType: true, fromMe: true },
    });

    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // If mediaUrl is already set and the file exists locally, redirect to it
    if (msg.mediaUrl && msg.mediaUrl.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'public', msg.mediaUrl);
      try {
        await fs.access(localPath);
        return NextResponse.redirect(new URL(msg.mediaUrl, request.url));
      } catch {
        // File doesn't exist locally, continue to fetch from Evolution API
      }
    }

    // Get chat → instance info
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

    // Call Evolution API to get media base64
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/findMessages/${instance.instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.accessToken,
        },
        body: JSON.stringify({
          where: { key: { id: msgId } },
          page: 1,
          offset: 1,
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Evolution API error', status: res.status }, { status: 502 });
    }

    const data = await res.json();

    // Evolution API returns messages array; find the one with base64 or url
    const msgs: any[] = Array.isArray(data) ? data : (data.messages || data.records || []);
    const found = msgs.find((m: any) => m.key?.id === msgId) || msgs[0];

    if (!found) return NextResponse.json({ error: 'Message not found in Evolution API' }, { status: 404 });

    const msgContent = found.message || {};
    const mediaContent =
      msgContent.imageMessage ||
      msgContent.videoMessage ||
      msgContent.audioMessage ||
      msgContent.documentMessage ||
      msgContent.stickerMessage;

    const base64Data: string | undefined = mediaContent?.base64 || found.base64;
    const cdnUrl: string | undefined = mediaContent?.url;
    const mimetype: string = mediaContent?.mimetype || msg.mediaMimetype || 'application/octet-stream';

    let buffer: Buffer | null = null;

    if (base64Data) {
      const b64 = base64Data.startsWith('data:') ? base64Data.split(',')[1] : base64Data;
      buffer = Buffer.from(b64, 'base64');
    } else if (cdnUrl) {
      const cdnRes = await fetch(cdnUrl, {
        headers: { 'apikey': instance.accessToken, 'User-Agent': 'Evolution-Client/1.0' },
      });
      if (cdnRes.ok) {
        buffer = Buffer.from(await cdnRes.arrayBuffer());
      }
    }

    if (!buffer) return NextResponse.json({ error: 'Media not available' }, { status: 404 });

    // Cache locally
    try {
      const ext = getExtensionFromMimetype(mimetype);
      const subDir = (msg.messageType || 'image').replace('Message', '').toLowerCase();
      const filename = `${Date.now()}-${uuidv4()}.${ext}`;
      const relativeDirPath = `uploads/${subDir}`;
      const absDir = path.join(process.cwd(), 'public', relativeDirPath);
      await fs.mkdir(absDir, { recursive: true });
      await fs.writeFile(path.join(absDir, filename), buffer);

      // Update DB with the cached local URL
      const localUrl = `/${relativeDirPath}/${filename}`;
      await db
        .update(messages)
        .set({ mediaUrl: localUrl, mediaMimetype: mimetype })
        .where(eq(messages.id, msgId));
    } catch {
      // Cache failure is non-fatal — just serve from memory
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
