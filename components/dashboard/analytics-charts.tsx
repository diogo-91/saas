'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';

// ─── FunnelLineChart ────────────────────────────────────────────────────
// data shape: { name: string, value: number }[]
export function FunnelLineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="col-span-3">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Progressão do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de funil disponível.</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map((d: any) => d.value || 0), 1);

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Progressão do Funil
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 truncate shrink-0">
                {item.name || `Etapa ${i + 1}`}
              </span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((item.value || 0) / maxValue) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold w-8 text-right tabular-nums">
                {item.value ?? 0}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── FunnelRadarChart ────────────────────────────────────────────────────
// data shape: { name: string, value: number }[]
export function FunnelRadarChart({ data }: { data: any[] }) {
  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Distribuição por Etapa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {data.map((item: any, i: number) => (
              <div key={i} className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary tabular-nums">{item.value ?? 0}</p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {item.name || `Etapa ${i + 1}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── AgentList ────────────────────────────────────────────────────────────
// data shape: { name: string, total: number, funnels: Record<string, number> }[]
export function AgentList({ data }: { data: any[] }) {
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Desempenho dos Atendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de atendente disponível.</p>
        ) : (
          <div className="space-y-3">
            {data.map((agent: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{agent.name || `Atendente ${i + 1}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary tabular-nums">{agent.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">contatos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── TrafficHeatmap ───────────────────────────────────────────────────────
// data shape: { day: number (0=Dom..6=Sáb), hour: number (0-23), count: number }[]
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}h`);
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function TrafficHeatmap({ data }: { data: any[] }) {
  const maxVal = data?.reduce((max: number, item: any) => Math.max(max, Number(item.count) || 0), 1) || 1;

  const getCell = (day: number, hour: number) => {
    const found = data?.find((d: any) => Number(d.day) === day && Number(d.hour) === hour);
    return Number(found?.count) || 0;
  };

  const getOpacity = (count: number) => Math.max(0.08, count / maxVal);

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Mapa de Tráfego de Mensagens
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de tráfego disponível.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `40px repeat(24, 18px)` }}>
              <div />
              {HOURS.map((h) => (
                <div key={h} className="text-[9px] text-muted-foreground text-center">{h}</div>
              ))}
              {DAYS.map((day, dayIdx) => (
                <>
                  <div key={`day-${dayIdx}`} className="text-[10px] text-muted-foreground flex items-center">{day}</div>
                  {HOURS.map((_, hourIdx) => {
                    const count = getCell(dayIdx, hourIdx);
                    return (
                      <div
                        key={`${dayIdx}-${hourIdx}`}
                        className="h-4 w-4 rounded-sm"
                        style={{ backgroundColor: `hsl(var(--primary) / ${getOpacity(count)})` }}
                        title={`${day} ${hourIdx}h: ${count} mensagens`}
                      />
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
