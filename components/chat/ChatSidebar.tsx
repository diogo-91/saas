'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User, Phone, Clock } from 'lucide-react';
import { ChatDetails } from './types';

interface ChatSidebarProps {
  chatDetails: ChatDetails;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ChatSidebar({ chatDetails }: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

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
        <h3 className="text-sm font-semibold">Contact Info</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center p-6 border-b">
        <Avatar className="h-20 w-20 mb-3">
          <AvatarImage src={chatDetails.profilePicUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <p className="font-semibold text-base text-center">{chatDetails.name}</p>
        <p className="text-sm text-muted-foreground">{phone}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Last Interaction</p>
              <p className="text-sm font-medium">{lastInteraction}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Integration</p>
              <p className="text-sm font-medium">{chatDetails.integration}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
