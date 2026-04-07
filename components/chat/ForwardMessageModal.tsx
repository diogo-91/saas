'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Forward, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from './types';
import { Chat } from '@/lib/db/schema';

interface ForwardMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  chats: Chat[];
  currentJid?: string | null;
  senderName?: string | null;
}

export function ForwardMessageModal({
  open,
  onOpenChange,
  message,
  chats,
  currentJid,
  senderName,
}: ForwardMessageModalProps) {
  const [search, setSearch] = useState('');
  const [loadingJid, setLoadingJid] = useState<string | null>(null);

  const filteredChats = useMemo(() => {
    const term = search.toLowerCase();
    return chats.filter((c) => {
      if (c.remoteJid === currentJid) return false;
      const name = (c.name || c.remoteJid || '').toLowerCase();
      return name.includes(term);
    });
  }, [chats, search, currentJid]);

  const handleForward = async (targetChat: Chat) => {
    if (!message) return;

    const text = message.mediaCaption || message.text;
    if (!text) {
      toast.error('Só é possível encaminhar mensagens de texto.');
      return;
    }

    setLoadingJid(targetChat.remoteJid!);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientJid: targetChat.remoteJid,
          text,
          instanceId: targetChat.instanceId,
        }),
      });

      if (!res.ok) throw new Error('Erro ao encaminhar');

      toast.success(`Encaminhado para ${targetChat.name || targetChat.remoteJid}`);
      onOpenChange(false);
      setSearch('');
    } catch {
      toast.error('Erro ao encaminhar mensagem.');
    } finally {
      setLoadingJid(null);
    }
  };

  const messagePreview = message?.mediaCaption || message?.text || '(mídia)';

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setSearch(''); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-4 w-4" />
            Encaminhar mensagem
          </DialogTitle>
        </DialogHeader>

        {/* Preview da mensagem */}
        <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground line-clamp-2 border-l-4 border-primary">
          {messagePreview}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Lista de contatos */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredChats.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhum contato encontrado.</p>
          )}
          {filteredChats.map((chat) => (
            <button
              key={`${chat.remoteJid}-${chat.instanceId}`}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
              onClick={() => handleForward(chat)}
              disabled={loadingJid !== null}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{chat.name || chat.remoteJid}</p>
                {chat.lastMessageText && (
                  <p className="text-xs text-muted-foreground truncate">{chat.lastMessageText}</p>
                )}
              </div>
              {loadingJid === chat.remoteJid ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-muted-foreground" />
              ) : (
                <Forward className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
