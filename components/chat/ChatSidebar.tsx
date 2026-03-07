import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Phone, Clock, Tag as TagIcon, Plus, KanbanSquare } from 'lucide-react';
import { ChatDetails, ContactData, FunnelStage, Tag, UserData } from './types';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ChatSidebarProps {
  chatDetails: ChatDetails;
  contactData?: ContactData | null;
  onContactUpdate?: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ChatSidebar({ chatDetails, contactData, onContactUpdate }: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: teamMembers } = useSWR<UserData[]>('/api/team/members', fetcher);
  const { data: allTags } = useSWR<Tag[]>('/api/tags', fetcher);
  const { data: funnelStages } = useSWR<FunnelStage[]>('/api/funnel-stages', fetcher);

  const phone = chatDetails.remoteJid?.split('@')[0] || '';
  const initials = chatDetails.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const lastInteraction = chatDetails.lastCustomerInteraction
    ? new Date(chatDetails.lastCustomerInteraction).toLocaleString()
    : 'N/A';

  const assignedUser = contactData?.assignedUser;
  const currentTags = contactData?.tags || [];
  const currentStage = contactData?.funnelStage;

  const getOrCreateContactId = async () => {
    if (contactData?.id) return contactData.id;

    // Auto-assign first funnel stage on creation
    let firstStageId: number | null = null;
    try {
      const stages = await fetch('/api/funnel-stages').then((r) => r.json());
      firstStageId = stages?.[0]?.id ?? null;
    } catch {
      // ignore
    }

    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jid: chatDetails.remoteJid,
        name: chatDetails.name,
        funnelStageId: firstStageId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initialize contact');
    }

    const newContact = await res.json();
    return newContact.id;
  };

  const handleAssignAgent = async (agentId: number | null) => {
    setIsUpdating(true);
    try {
      const contactId = await getOrCreateContactId();
      if (!contactId) throw new Error('Could not obtain contact record');

      const res = await fetch(`/api/contacts/${contactId}/assign-agent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error('Falha ao atribuir atendente.');
      toast.success(agentId ? 'Atendente atribuído!' : 'Atendente removido!');
      if (onContactUpdate) onContactUpdate();
      mutate(chatDetails.remoteJid ? `/api/contacts/by-chat?jid=${chatDetails.remoteJid}` : null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleTag = async (tag: Tag) => {
    setIsUpdating(true);
    const hasTag = currentTags.some((t) => t.id === tag.id);

    try {
      const contactId = await getOrCreateContactId();
      if (!contactId) throw new Error('Could not obtain contact record');

      let res;
      if (hasTag) {
        res = await fetch(`/api/contacts/${contactId}/tags/${tag.id}`, { method: 'DELETE' });
      } else {
        res = await fetch(`/api/contacts/${contactId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId: tag.id }),
        });
      }

      if (!res.ok) throw new Error(`Falha ao ${hasTag ? 'remover' : 'adicionar'} a tag`);
      toast.success(`Tag ${hasTag ? 'removida' : 'adicionada'}!`);
      if (onContactUpdate) onContactUpdate();
      mutate(chatDetails.remoteJid ? `/api/contacts/by-chat?jid=${chatDetails.remoteJid}` : null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeStage = async (stage: FunnelStage | null) => {
    setIsUpdating(true);
    try {
      const contactId = await getOrCreateContactId();
      if (!contactId) throw new Error('Could not obtain contact record');

      const res = await fetch(`/api/contacts/${contactId}/funnel-stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: stage?.id ?? null }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar etapa do funil.');
      toast.success(stage ? `Movido para "${stage.name}"!` : 'Removido do funil!');
      if (onContactUpdate) onContactUpdate();
      mutate(chatDetails.remoteJid ? `/api/contacts/by-chat?jid=${chatDetails.remoteJid}` : null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (collapsed) {
    return (
      <div className="w-10 border-l border-border/40 bg-card flex flex-col items-center pt-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(false)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-72 border-l border-border/40 bg-muted/20 flex flex-col overflow-y-auto shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card">
        <h3 className="text-sm font-semibold">Informações de Contato</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(true)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center py-6 px-4 bg-card border-b border-border/40 shadow-sm">
        <Avatar className="h-20 w-20 mb-3 ring-2 ring-primary/10 ring-offset-2">
          <AvatarImage src={chatDetails.profilePicUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <p className="font-semibold text-base text-center uppercase tracking-tight">{chatDetails.name}</p>
        <p className="text-[13px] text-muted-foreground font-medium"># {phone}</p>
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3">

        {/* Telefone + Última Interação */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-[0_1px_4px_0_rgb(0,0,0,0.04)] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="text-sm font-medium">{phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Última Interação</p>
              <p className="text-sm font-medium">{lastInteraction}</p>
            </div>
          </div>
        </div>

        {/* Atribuição */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-[0_1px_4px_0_rgb(0,0,0,0.04)] p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atribuição</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[10px]">
                  {assignedUser ? (assignedUser.name?.[0] || assignedUser.email[0]).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">
                {assignedUser ? assignedUser.name || assignedUser.email : 'Não Atribuído'}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUpdating} className="h-7 text-xs px-2 shrink-0">
                  {assignedUser ? 'Transferir' : 'Atribuir'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Selecionar Atendente</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAssignAgent(null)}>
                  Não Atribuído
                </DropdownMenuItem>
                {teamMembers?.map((member) => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => handleAssignAgent(member.id)}
                    className={assignedUser?.id === member.id ? 'bg-accent font-medium' : ''}
                  >
                    {member.name || member.email}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Funil */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-[0_1px_4px_0_rgb(0,0,0,0.04)] p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <KanbanSquare className="h-3 w-3" /> Funil
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStage ? (
                <>
                  {currentStage.emoji && <span className="text-base leading-none">{currentStage.emoji}</span>}
                  <span className="text-sm font-medium">{currentStage.name}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">Sem etapa</span>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUpdating} className="h-7 text-xs px-2 shrink-0">
                  {currentStage ? 'Mover' : 'Definir'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Etapa do Funil</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleChangeStage(null)}>
                  Sem etapa
                </DropdownMenuItem>
                {funnelStages?.map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => handleChangeStage(stage)}
                    className={currentStage?.id === stage.id ? 'bg-accent font-medium' : ''}
                  >
                    {stage.emoji && <span className="mr-2">{stage.emoji}</span>}
                    {stage.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Etiquetas */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-[0_1px_4px_0_rgb(0,0,0,0.04)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TagIcon className="h-3 w-3" /> Etiquetas
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isUpdating}>
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Selecionar Etiquetas</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      const name = window.prompt('Nome da nova etiqueta:');
                      if (!name) return;
                      const colors = ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#d8b4fe', '#f9a8d4'];
                      const color = colors[Math.floor(Math.random() * colors.length)];
                      setIsUpdating(true);
                      fetch('/api/tags', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, color }),
                      })
                        .then((res) => {
                          if (!res.ok) throw new Error('Falha ao criar etiqueta.');
                          toast.success('Etiqueta criada!');
                          mutate('/api/tags');
                        })
                        .catch((e) => toast.error(e.message))
                        .finally(() => setIsUpdating(false));
                    }}
                  >
                    + Nova
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!allTags?.length ? (
                  <div className="p-4 text-xs text-muted-foreground text-center italic">
                    Nenhuma etiqueta. Clique em "+ Nova".
                  </div>
                ) : (
                  allTags.map((tag) => {
                    const isSelected = currentTags.some((t) => t.id === tag.id);
                    return (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={(e) => { e.preventDefault(); handleToggleTag(tag); }}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || 'gray' }} />
                          <span>{tag.name}</span>
                        </div>
                        {isSelected && <span className="text-xs font-bold">✓</span>}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {currentTags.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Nenhuma etiqueta</span>
            ) : (
              currentTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs font-normal border-transparent cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color || 'inherit' }}
                  onClick={() => handleToggleTag(tag)}
                >
                  {tag.name} ×
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Integração */}
        <div className="rounded-xl border bg-card shadow-sm p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Integração</p>
          <p className="text-sm font-medium">{chatDetails.integration}</p>
        </div>

      </div>
    </aside>
  );
}
