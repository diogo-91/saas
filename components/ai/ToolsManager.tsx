'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Wrench, ImageIcon, FileText, Video } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AiTool {
  id: number;
  name: string;
  description: string;
  mediaUrl: string;
  mediaType: string;
  caption: string | null;
  confirmationMessage: string | null;
  isActive: boolean;
}

function MediaTypeIcon({ type }: { type: string }) {
  if (type.includes('image')) return <ImageIcon className="h-4 w-4" />;
  if (type.includes('video')) return <Video className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function ToolsManager() {
  const { data: tools, isLoading } = useSWR<AiTool[]>('/api/ai/tools', fetcher);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    mediaUrl: '',
    mediaType: 'image/jpeg',
    caption: '',
    confirmationMessage: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/ai/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create tool');
      toast.success('Tool created!');
      mutate('/api/ai/tools');
      setIsDialogOpen(false);
      setForm({ name: '', description: '', mediaUrl: '', mediaType: 'image/jpeg', caption: '', confirmationMessage: '' });
    } catch {
      toast.error('Failed to create tool');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (tool: AiTool) => {
    try {
      await fetch(`/api/ai/tools/${tool.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tool.isActive }),
      });
      mutate('/api/ai/tools');
    } catch {
      toast.error('Failed to update tool');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this tool?')) return;
    try {
      await fetch(`/api/ai/tools/${id}`, { method: 'DELETE' });
      toast.success('Tool deleted');
      mutate('/api/ai/tools');
    } catch {
      toast.error('Failed to delete tool');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Media Tools</h3>
          <p className="text-sm text-muted-foreground">
            Tools allow the AI to send media files (images, documents, videos) during conversations.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Add Tool
        </Button>
      </div>

      {!tools || tools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-xl bg-muted/20">
          <Wrench className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="font-medium">No tools yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add media tools the AI can use</p>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add First Tool
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <Card key={tool.id} className={tool.isActive ? '' : 'opacity-60'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-muted shrink-0">
                      <MediaTypeIcon type={tool.mediaType} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{tool.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{tool.mediaType}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={tool.isActive} onCheckedChange={() => handleToggle(tool)} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(tool.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                {tool.caption && (
                  <p className="text-xs mt-1 text-foreground/70 truncate">Caption: {tool.caption}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Media Tool</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Tool Name *</Label>
              <Input
                placeholder="e.g. send_catalog"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">The AI will use this name to call the tool</p>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe when the AI should use this tool..."
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Media URL *</Label>
              <Input
                placeholder="https://..."
                value={form.mediaUrl}
                onChange={(e) => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Caption</Label>
              <Input
                placeholder="Optional caption for the media"
                value={form.caption}
                onChange={(e) => setForm(f => ({ ...f, caption: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Tool
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
