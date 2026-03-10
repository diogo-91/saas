'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, MoreVertical, CheckCheck, XCircle, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatDetails } from './types';

interface ChatHeaderProps {
  chatDetails: ChatDetails;
  chatId?: number;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onCloseChat?: () => Promise<void>;
  onMarkUnread?: () => void;
  onDownloadChat?: () => void;
}

export function ChatHeader({
  chatDetails,
  chatId,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  onCloseChat,
  onMarkUnread,
  onDownloadChat,
}: ChatHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);

  const initials = chatDetails.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleCloseChat = async () => {
    if (!onCloseChat) return;
    setIsLoading(true);
    try {
      await onCloseChat();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background h-[72px] shrink-0">
        {showSearch ? (
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              placeholder="Pesquisar mensagens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none shadow-none focus-visible:ring-0 h-8 p-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={chatDetails.profilePicUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-[15px] truncate uppercase">{chatDetails.name}</p>
                <p className="text-[13px] text-muted-foreground truncate font-medium">
                  # {chatDetails.remoteJid?.split('@')[0]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => setShowSearch(true)}
                title="Pesquisar"
              >
                <Search className="h-4 w-4" />
              </Button>

              {onDownloadChat && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  onClick={onDownloadChat}
                  title="Exportar conversa"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    disabled={isLoading}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {onMarkUnread && (
                    <DropdownMenuItem onClick={onMarkUnread}>
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Marcar como não lida
                    </DropdownMenuItem>
                  )}
                  {onCloseChat && (
                    <DropdownMenuItem onClick={handleCloseChat}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Finalizar conversa
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </header>

    </>
  );
}
