import { getDashboardStats } from './actions';
import { TrafficHeatmap, FunnelLineChart, FunnelRadarChart, AgentList } from '@/components/dashboard/analytics-charts';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getUserWithTeam } from '@/lib/db/queries';

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/sign-in');
  }

  const userTeamData = await getUserWithTeam(session.user.id);
  
  if (!userTeamData || !userTeamData.teamId) {
    return (
        <div className="flex-1 p-8 pt-6">
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Team not found or user not assigned to a team.</p>
            </div>
        </div>
    );
  }

  const { funnelMetrics, agentMetrics, trafficMetrics } = await getDashboardStats(userTeamData.teamId);

  return (
    <div className="flex-1 flex flex-col bg-muted/40 p-6 gap-5 overflow-auto">
      <header className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do desempenho do seu time e funil de vendas.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <FunnelLineChart data={funnelMetrics} />
        <FunnelRadarChart data={funnelMetrics} />
        <AgentList data={agentMetrics} />
        <TrafficHeatmap data={trafficMetrics} />
      </div>
    </div>
  );
}