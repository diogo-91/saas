'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PlanFormProps {
  plan?: {
    id?: number;
    name?: string;
    description?: string | null;
    amount?: number;
    maxUsers?: number;
    maxContacts?: number;
    maxInstances?: number;
    isAiEnabled?: boolean;
    isFlowBuilderEnabled?: boolean;
    isCampaignsEnabled?: boolean;
    isTemplatesEnabled?: boolean;
    stripeProductId?: string;
    stripePriceId?: string;
    trialDays?: number;
  };
}

export function PlanForm({ plan }: PlanFormProps) {
  const router = useRouter();
  const isEditing = !!plan?.id;
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    amount: plan?.amount || 0,
    maxUsers: plan?.maxUsers || 1,
    maxContacts: plan?.maxContacts || 1000,
    maxInstances: plan?.maxInstances || 1,
    isAiEnabled: plan?.isAiEnabled || false,
    isFlowBuilderEnabled: plan?.isFlowBuilderEnabled || false,
    isCampaignsEnabled: plan?.isCampaignsEnabled || false,
    isTemplatesEnabled: plan?.isTemplatesEnabled || false,
    stripeProductId: plan?.stripeProductId || '',
    stripePriceId: plan?.stripePriceId || '',
    trialDays: plan?.trialDays || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = isEditing ? `/api/admin/plans/${plan!.id}` : '/api/admin/plans';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save plan');
      toast.success(isEditing ? 'Plan updated!' : 'Plan created!');
      router.push('/admin/plans');
      router.refresh();
    } catch {
      toast.error('Failed to save plan. Check your input.');
    } finally {
      setIsLoading(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key] as any,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value })),
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name *</Label>
            <Input {...field('name')} placeholder="e.g. Professional" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...field('description')} placeholder="Describe this plan..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (cents)</Label>
              <Input {...field('amount')} type="number" min={0} placeholder="e.g. 4900 = $49" />
            </div>
            <div className="space-y-2">
              <Label>Trial Days</Label>
              <Input {...field('trialDays')} type="number" min={0} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stripe IDs</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Stripe Product ID</Label>
            <Input {...field('stripeProductId')} placeholder="prod_..." />
          </div>
          <div className="space-y-2">
            <Label>Stripe Price ID</Label>
            <Input {...field('stripePriceId')} placeholder="price_..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Limits</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Max Users</Label>
            <Input {...field('maxUsers')} type="number" min={1} />
          </div>
          <div className="space-y-2">
            <Label>Max Contacts</Label>
            <Input {...field('maxContacts')} type="number" min={1} />
          </div>
          <div className="space-y-2">
            <Label>Max Instances</Label>
            <Input {...field('maxInstances')} type="number" min={1} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Features</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'isAiEnabled', label: 'AI Agent' },
            { key: 'isFlowBuilderEnabled', label: 'Flow Builder / Automation' },
            { key: 'isCampaignsEnabled', label: 'Campaigns' },
            { key: 'isTemplatesEnabled', label: 'WhatsApp Templates' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch
                checked={form[key as keyof typeof form] as boolean}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, [key]: checked }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isEditing ? 'Update Plan' : 'Create Plan'}
        </Button>
      </div>
    </form>
  );
}
