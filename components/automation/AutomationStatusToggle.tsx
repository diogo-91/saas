'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface AutomationStatusToggleProps {
  id: number;
  initialActive: boolean;
}

export function AutomationStatusToggle({ id, initialActive }: AutomationStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialActive);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    const prev = isActive;
    setIsActive(checked);
    try {
      const res = await fetch(`/api/automations/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: checked }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(checked ? 'Automation activated' : 'Automation deactivated');
    } catch {
      setIsActive(prev);
      toast.error('Failed to update automation status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Switch
      checked={isActive}
      onCheckedChange={handleToggle}
      disabled={isLoading}
      aria-label="Toggle automation status"
    />
  );
}
