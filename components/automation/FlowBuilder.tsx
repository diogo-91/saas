'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Loader2, GitMerge, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AutomationStatusToggle } from './AutomationStatusToggle';

interface FlowBuilderProps {
  automationId: number;
  initialNodes: any[];
  initialEdges: any[];
  initialActive: boolean;
}

// Simple node card rendering
function NodeCard({ node }: { node: any }) {
  const typeColors: Record<string, string> = {
    start: 'border-green-500 bg-green-50 dark:bg-green-950/20',
    message: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
    condition: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    delay: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20',
    end: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  };
  const color = typeColors[node.type] || 'border-border bg-muted';

  return (
    <div className={`border-2 rounded-lg p-3 min-w-[160px] ${color}`}>
      <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide">{node.type}</p>
      <p className="text-sm font-medium mt-1">{node.data?.label || node.id}</p>
      {node.data?.message && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{node.data.message}</p>
      )}
    </div>
  );
}

export default function FlowBuilder({ automationId, initialNodes, initialEdges, initialActive }: FlowBuilderProps) {
  const [nodes, setNodes] = useState(initialNodes);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/automations/${automationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges: initialEdges }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Automation saved!');
    } catch {
      toast.error('Failed to save automation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-background border-b shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/automation">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <GitMerge className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-sm">Flow Builder</h1>
          <span className="text-xs text-muted-foreground">#{automationId}</span>
        </div>
        <div className="flex items-center gap-3">
          <AutomationStatusToggle id={automationId} initialActive={initialActive} />
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-400">
          <strong>Flow Builder</strong> — A visual drag-and-drop flow builder will be available here. Currently showing a text-based view of nodes.
        </div>

        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl text-muted-foreground">
            <GitMerge className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No nodes yet</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {nodes.map((node: any) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
