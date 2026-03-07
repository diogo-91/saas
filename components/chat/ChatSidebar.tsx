import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User, Phone, Clock, Tag as TagIcon, Plus } from 'lucide-react';
import { ChatDetails, ContactData, Tag, UserData } from './types';
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

  const getOrCreateContactId = async () => {
    if (contactData?.id) return contactData.id;

    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jid: chatDetails.remoteJid,
        name: chatDetails.name,
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
      toast.success(agentId ? 'Atendente atribuído com sucesso!' : 'Atendente removido com sucesso!');
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
        res = await fetch(`/api/contacts/${contactId}/tags/${tag.id}`, {
          method: 'DELETE',
        });
      } else {
        res = await fetch(`/api/contacts/${contactId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId: tag.id }),
        });
      }

      if (!res.ok) throw new Error(`Falha ao ${hasTag ? 'remover' : 'adicionar'} a tag`);
      toast.success(`Tag ${hasTag ? 'removida' : 'adicionada'} com sucesso!`);
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
      <div className="w-10 border-l bg-card flex flex-col items-center pt-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-72 border-l bg-card flex flex-col overflow-y-auto shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Informações de Contato</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center p-6 border-b min-h-[180px]">
        <Avatar className="h-20 w-20 mb-3">
          <AvatarImage src={chatDetails.profilePicUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <p className="font-semibold text-base text-center uppercase tracking-tight">{chatDetails.name}</p>
        <p className="text-[13px] text-muted-foreground font-medium"># {phone}</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Contact Details Section */}
        <div className="space-y-3">
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

        {/* Assignment Section */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atribuição</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{assignedUser ? assignedUser.name?.[0] || assignedUser.email[0] : 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{assignedUser ? assignedUser.name || assignedUser.email : 'Não Atribuído'}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUpdating} className="h-7 text-xs px-2">
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

        {/* Tags Section */}
        <div className="space-y-3 border-t pt-4">
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
                      const name = window.prompt('Digite o nome da nova etiqueta:');
                      if (!name) return;
                      // Lighter pastel colors more suitable for dark mode readability
                      const color = ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#d8b4fe', '#f9a8d4'][Math.floor(Math.random() * 7)];

                      setIsUpdating(true);
                      fetch('/api/tags', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, color })
                      })
                        .then(res => {
                          if (!res.ok) throw new Error('Falha ao criar etiqueta.');
                          toast.success('Etiqueta criada! Você já pode aplicá-la.');
                          mutate('/api/tags');
                        })
                        .catch(e => toast.error(e.message))
                        .finally(() => setIsUpdating(false));
                    }}
                  >
                    + Nova
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTags?.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground text-center italic">Nenhuma etiqueta existe. Clique em "+ Nova" acima.</div>
                ) : (
                  allTags?.map((tag) => {
                    const isSelected = currentTags.some((t) => t.id === tag.id);
                    return (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleTag(tag);
                        }}
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
              <span className="text-xs text-muted-foreground italic">Nenhuma etiqueta adicionada</span>
            ) : (
              currentTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs font-normal border-transparent hover:bg-opacity-80 transition-colors"
                  style={{ backgroundColor: `${tag.color}15` || '#e2e8f0', color: tag.color || 'inherit' }}
                >
                  {tag.name}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Integration Details Section */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Integração</p>
          <p className="text-sm font-medium">{chatDetails.integration}</p>
        </div>
      </div>
    </aside>
  );
}
