import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const team = await getTeamForUser();
        if (!team) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const members = await db.query.teamMembers.findMany({
            where: eq(teamMembers.teamId, team.id),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    }
                }
            }
        });

        const formattedMembers = members.map(m => m.user);

        return NextResponse.json(formattedMembers);

    } catch (error: any) {
        console.error('Error fetching team members:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
