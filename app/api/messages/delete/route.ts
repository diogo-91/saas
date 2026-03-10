import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { messages, chats, evolutionInstances } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';

export async function DELETE(request: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await request.json();
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    // Find the message and its chat
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
      with: {
        chat: {
          with: { instance: true }
        }
      }
    });

    if (!message || message.chat.teamId !== team.id) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // If NOT internal note and fromMe, try to delete on WhatsApp via Evolution API
    if (!message.isInternal && message.fromMe && message.chat.instance) {
      const { instanceName, accessToken } = message.chat.instance;
      try {
        await fetch(`${EVOLUTION_API_URL}/chat/deleteMessageForEveryone/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': accessToken,
          },
          body: JSON.stringify({
            id: messageId,
            remoteJid: message.chat.remoteJid,
            fromMe: true,
          }),
        });
      } catch (_) {
        // Evolution API call is best-effort — still delete locally
      }
    }

    // Delete from our database
    await db.delete(messages).where(
      and(eq(messages.id, messageId))
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
