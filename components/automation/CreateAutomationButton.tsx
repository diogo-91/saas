'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CreateAutomationButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { data: instances } = useSWR('/api/instance/details', fetcher);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, instanceId: instanceId ? Number(instanceId) : null }),
      });
      if (!res.ok) throw new Error('Failed to create automation');
      const data = await res.json();
      toast.success('Automation created!');
      setOpen(false);
      setName('');
      router.push(`/automation/${data.id}`);
      router.refresh();
    } catch {
      toast.error('Failed to create automation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1">
        <Plus className="h-4 w-4" /> New Automation
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                autoFocus
                placeholder="e.g. Welcome Flow"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {instances && instances.length > 0 && (
              <div className="space-y-2">
                <Label>Instance</Label>
                <Select value={instanceId} onValueChange={setInstanceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select instance (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances.map((inst: any) => (
                      <SelectItem key={inst.dbId} value={String(inst.dbId)}>
                        {inst.instanceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !name.trim()}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
