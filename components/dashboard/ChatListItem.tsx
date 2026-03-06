'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Check, CheckCheck, Image as ImageIcon, Mic, FileText } from 'lucide-react';

export type Chat = {
  id: number;
  teamId: number;
  instanceId: number | null;
  remoteJid: string;
  name: string | null;
  pushName: string | null;
  profilePicUrl: string | null;
  lastMessageText: string | null;
  lastMessageTimestamp: Date | string | null;
  lastCustomerInteraction: Date | string | null;
  unreadCount: number | null;
  lastMessageStatus: string | null;
  lastMessageFromMe: boolean | null;
  contact?: {
    id?: number;
    name?: string;
    funnelStage?: { id: number; name: string; emoji?: string } | null;
    assignedUser?: { id: number; name: string | null; email: string } | null;
    tags?: { id: number; name: string; color: string }[];
  } | null;
};

type InstanceData = {
  dbId: number;
  instanceName: string;
  integration: string;
};

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  instances: InstanceData[];
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (chatId: number) => void;
}

function formatLastMessageTime(timestamp: Date | string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

function getMessagePreview(chat: Chat): { icon: React.ReactNode; text: string } {
  const text = chat.lastMessageText || '';
  if (text.includes('[image]') || text.startsWith('data:image')) {
    return { icon: <ImageIcon className="h-3 w-3 shrink-0" />, text: 'Photo' };
  }
  if (text.includes('[audio]') || text.includes('[voice]')) {
    return { icon: <Mic className="h-3 w-3 shrink-0" />, text: 'Audio' };
  }
  if (text.includes('[document]') || text.includes('[file]')) {
    return { icon: <FileText className="h-3 w-3 shrink-0" />, text: 'Document' };
  }
  return { icon: null, text: text };
}

function MessageStatus({ status }: { status: string | null }) {
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-400 shrink-0" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-muted-foreground shrink-0" />;
  if (status === 'sent') return <Check className="h-3 w-3 text-muted-foreground shrink-0" />;
  return null;
}

export function ChatListItem({
  chat,
  isActive,
  instances,
  isSelectionMode,
  isSelected,
  onSelect,
}: ChatListItemProps) {
  const router = useRouter();
  const phone = chat.remoteJid.split('@')[0];
  const displayName =
    chat.contact?.name || chat.name || chat.pushName || phone;

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const instance = instances.find((i) => i.dbId === chat.instanceId);
  const preview = getMessagePreview(chat);
  const timeStr = formatLastMessageTime(chat.lastMessageTimestamp);
  const hasUnread = chat.unreadCount && chat.unreadCount > 0;

  const handleClick = () => {
    if (isSelectionMode) {
      onSelect(chat.id);
      return;
    }
    const path = `/dashboard/chat/${phone}${chat.instanceId ? `?instanceId=${chat.instanceId}` : ''}`;
    router.push(path);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 ${
        isActive
          ? 'bg-primary/10 border-l-2 border-l-primary'
          : 'hover:bg-muted/50'
      } ${isSelected ? 'bg-primary/5' : ''}`}
    >
      {isSelectionMode && (
        <div className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}

      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={chat.profilePicUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {instance && (
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center">
            <div className={`h-2 w-2 rounded-full ${instance.integration === 'WHATSAPP-BAILEYS' ? 'bg-green-500' : 'bg-blue-500'}`} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
            {displayName}
          </p>
          <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">{timeStr}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {chat.lastMessageFromMe && <MessageStatus status={chat.lastMessageStatus} />}
          {preview.icon}
          <p className={`text-xs truncate ${hasUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
            {preview.text || '\u00A0'}
          </p>
          {hasUnread && (
            <Badge className="ml-auto h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 shrink-0">
              {chat.unreadCount! > 99 ? '99+' : chat.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
