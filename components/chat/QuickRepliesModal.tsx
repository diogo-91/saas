'use client';

import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search } from 'lucide-react';

interface QuickRepliesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function QuickRepliesModal({ open, onOpenChange }: QuickRepliesModalProps) {
  const [search, setSearch] = useState('');
  const { data: replies } = useSWR(open ? '/api/quick-replies' : null, fetcher);

  const filtered = replies?.filter((r: any) =>
    r.shortcut.toLowerCase().includes(search.toLowerCase()) ||
    r.content.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Respostas Rápidas</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar respostas rápidas..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? 'Nenhuma resposta rápida encontrada.' : 'Nenhuma resposta rápida. Adicione em Configurações.'}
            </p>
          ) : (
            filtered.map((reply: any) => (
              <div
                key={reply.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                <p className="text-sm font-medium text-primary">/{reply.shortcut}</p>
                <p className="text-sm text-muted-foreground truncate">{reply.content}</p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
