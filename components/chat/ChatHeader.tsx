'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, Phone, MoreVertical } from 'lucide-react';
import { ChatDetails } from './types';

interface ChatHeaderProps {
  chatDetails: ChatDetails;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function ChatHeader({
  chatDetails,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
}: ChatHeaderProps) {
  const initials = chatDetails.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-background h-[72px] shrink-0">
      {showSearch ? (
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder="Search messages..."
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
              <p className="font-semibold text-sm truncate">{chatDetails.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {chatDetails.remoteJid?.split('@')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </header>
  );
}
