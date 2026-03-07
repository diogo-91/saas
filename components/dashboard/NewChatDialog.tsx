'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';

type InstanceData = {
  dbId: number;
  instanceName: string;
  integration: string;
};

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  instances: InstanceData[];
}

export function NewChatDialog({ isOpen, onClose, instances }: NewChatDialogProps) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [instanceId, setInstanceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) {
      toast.error('Por favor, insira um número de telefone válido');
      return;
    }

    setIsLoading(true);
    try {
      const path = `/dashboard/chat/${cleaned}${instanceId ? `?instanceId=${instanceId}` : ''}`;
      router.push(path);
      onClose();
      setPhone('');
      setInstanceId('');
    } catch {
      toast.error('Falha ao abrir o chat');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Nova Conversa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de telefone</Label>
            <Input
              id="phone"
              placeholder="Ex: 5511999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Inclua o código do país (Ex: 55 para o Brasil)
            </p>
          </div>

          {instances.length > 1 && (
            <div className="space-y-2">
              <Label>Instância</Label>
              <Select value={instanceId} onValueChange={setInstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((inst) => (
                    <SelectItem key={inst.dbId} value={String(inst.dbId)}>
                      {inst.instanceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !phone.trim()}>
              Abrir Conversa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
