'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  BarChart3,
  Users,
  LayoutTemplate,
  Megaphone,
  GitMerge,
  Settings,
  Bot,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/[locale]/(login)/actions';
import useSWR from 'swr';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const navItems = [
  { href: '/dashboard',   label: 'Conversas', icon: MessageCircle,  adminOnly: false, hidden: false },
  { href: '/contacts',    label: 'Contatos',  icon: Users,           adminOnly: false, hidden: false },
  { href: '/analytics',   label: 'Relatórios',icon: BarChart3,       adminOnly: true,  hidden: false },
  { href: '/automation',  label: 'Automação', icon: GitMerge,        adminOnly: true,  hidden: true  },
  { href: '/templates',   label: 'Modelos',   icon: LayoutTemplate,  adminOnly: true,  hidden: true  },
  { href: '/campaigns',   label: 'Campanhas', icon: Megaphone,       adminOnly: true,  hidden: true  },
  { href: '/settings/ai', label: 'Agente IA', icon: Bot,             adminOnly: true,  hidden: true  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: user } = useSWR('/api/user', fetcher);
  const { data: teamData } = useSWR('/api/team', fetcher);

  const isActive = (href: string) => {
    // Strip locale prefix for matching
    const normalized = pathname.replace(/^\/[a-z]{2}\//, '/').replace(/^\/[a-z]{2}$/, '/');
    if (href === '/dashboard') {
      return normalized === href || normalized.startsWith('/dashboard');
    }
    return normalized.startsWith(href);
  };

  const myTeamMember = teamData?.teamMembers?.find((tm: any) => tm.userId === user?.id);
  const isMember = myTeamMember?.role === 'member';
  const visibleNavItems = navItems.filter(item => !item.hidden && (!item.adminOnly || !isMember));

  const userInitials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 text-slate-50 border-r border-slate-800/50 transition-all duration-300 shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-800/50 h-[60px]">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary-foreground" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight">WhatsSaaS</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const item = (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={href} delayDuration={0}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return item;
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800/50 p-2 space-y-1">
        {!isMember && (
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-50 transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && 'Configurações'}
          </Link>
        )}

        <div className={cn('flex items-center gap-2 px-2 py-2', collapsed && 'justify-center')}>
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{userInitials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{user?.name || user?.email || ''}</p>
              </div>
              <form action={signOut}>
                <button type="submit" className="text-slate-400 hover:text-red-400 transition-colors">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-full text-slate-400 hover:text-slate-50 hover:bg-slate-800', collapsed ? 'w-10' : 'w-full')}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
