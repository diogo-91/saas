import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { chats, contacts } from '@/lib/db/schema';
import { eq, notInArray, isNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Busca todos os chats do time que ainda não têm contato associado
    const existingContactChatIds = await db
      .select({ chatId: contacts.chatId })
      .from(contacts)
      .where(eq(contacts.teamId, team.id));

    const usedChatIds = existingContactChatIds.map((c) => c.chatId);

    const chatsWithoutContact = await db
      .select({ id: chats.id, name: chats.name, pushName: chats.pushName, remoteJid: chats.remoteJid })
      .from(chats)
      .where(
        usedChatIds.length > 0
          ? sql`${chats.teamId} = ${team.id} AND ${chats.id} NOT IN (${sql.join(usedChatIds.map(id => sql`${id}`), sql`, `)})`
          : eq(chats.teamId, team.id)
      );

    if (chatsWithoutContact.length === 0) {
      return NextResponse.json({ created: 0, message: 'Todos os contatos já estão sincronizados.' });
    }

    const newContacts = chatsWithoutContact.map((chat) => ({
      teamId: team.id,
      chatId: chat.id,
      name: chat.pushName || chat.name || chat.remoteJid.split('@')[0],
    }));

    await db.insert(contacts).values(newContacts).onConflictDoNothing();

    return NextResponse.json({ created: newContacts.length });
  } catch (error: any) {
    console.error('[sync-contacts]', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
