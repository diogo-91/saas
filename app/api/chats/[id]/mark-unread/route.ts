import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { chats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const team = await getTeamForUser();
        if (!team) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const chatId = parseInt(id);

        if (isNaN(chatId)) {
            return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
        }

        const updated = await db.update(chats)
            .set({ unreadCount: 1 })
            .where(and(eq(chats.id, chatId), eq(chats.teamId, team.id)))
            .returning({ id: chats.id });

        if (updated.length === 0) {
            return NextResponse.json({ error: 'Chat not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true, chatId });
    } catch (error: any) {
        console.error('Error in /api/chats/[id]/mark-unread:', error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
