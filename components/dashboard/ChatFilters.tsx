'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Filter, ChevronDown } from 'lucide-react';

type FilterState = {
  funnelStageId: number | null;
  tagId: number | null;
  agentId: number | null;
  instanceId: number | null;
};

type InstanceData = {
  dbId: number;
  instanceName: string;
  integration: string;
};

interface ChatFiltersProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  instances: InstanceData[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ChatFilters({
  activeTab,
  setActiveTab,
  filters,
  setFilters,
  instances,
}: ChatFiltersProps) {
  const { data: funnelStages } = useSWR('/api/funnel-stages', fetcher);
  const { data: tags } = useSWR('/api/tags', fetcher);
  const { data: teamMembers } = useSWR('/api/team/members', fetcher);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ funnelStageId: null, tagId: null, agentId: null, instanceId: null });
  };

  return (
    <div className="border-b bg-background">
      <div className="flex items-center px-2 py-1 gap-1">
        <button
          className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${activeTab === 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('all')}
        >
          Todos
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${activeTab === 'unread' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('unread')}
        >
          Não lidas
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs px-2">
              <Filter className="h-3 w-3" />
              {activeCount > 0 && (
                <Badge className="h-4 min-w-4 rounded-full text-[10px] px-1 bg-primary">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">Filtros</DropdownMenuLabel>

            {teamMembers?.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Responsável</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFilters({ ...filters, agentId: null })}>
                  <span className={!filters.agentId ? 'text-primary font-medium' : ''}>Todos</span>
                </DropdownMenuItem>
                {teamMembers.map((member: any) => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => setFilters({ ...filters, agentId: member.id })}
                  >
                    <span className={filters.agentId === member.id ? 'text-primary font-medium' : ''}>
                      {member.name || member.email}
                    </span>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {funnelStages?.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Etapa do Funil</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFilters({ ...filters, funnelStageId: null })}>
                  <span className={!filters.funnelStageId ? 'text-primary font-medium' : ''}>Todas etapas</span>
                </DropdownMenuItem>
                {funnelStages.map((stage: any) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => setFilters({ ...filters, funnelStageId: stage.id })}
                  >
                    <span className={filters.funnelStageId === stage.id ? 'text-primary font-medium' : ''}>
                      {stage.emoji} {stage.name}
                    </span>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {activeCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters} className="text-destructive focus:text-destructive">
                  Limpar filtros
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
