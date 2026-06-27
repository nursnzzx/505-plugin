'use client';

import { useEffect, useState } from 'react';
import { Pin, Megaphone, Sparkles, FileText, Wrench } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import type { Announcement } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const KIND_ICON = {
  NEWS: Megaphone,
  UPDATE: Sparkles,
  CHANGELOG: FileText,
  MAINTENANCE: Wrench,
} as const;

export default function NewsPage() {
  const [items, setItems] = useState<Announcement[] | null>(null);

  useEffect(() => {
    api.get<Announcement[]>('/news').then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-white">News</h1>
      <p className="text-sm text-muted">Announcements, updates and changelog.</p>

      <section className="mt-5 space-y-3">
        {!items
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
          : items.length === 0
            ? <Card className="text-center text-sm text-muted">No announcements yet.</Card>
            : items.map((a, i) => {
                const Icon = KIND_ICON[a.kind as keyof typeof KIND_ICON] ?? Megaphone;
                return (
                  <Card key={a.id} delay={i * 0.05}>
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-accent" />
                      <span className="chip bg-white/5 text-muted">{a.kind}</span>
                      {a.isPinned && (
                        <span className="chip bg-accent/12 text-accent">
                          <Pin size={12} /> Pinned
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted">{formatDate(a.publishedAt)}</span>
                    </div>
                    <h2 className="mt-2 font-semibold text-white">{a.title}</h2>
                    <p className="mt-1 whitespace-pre-line text-sm text-white/75">{a.body}</p>
                  </Card>
                );
              })}
      </section>
    </AppShell>
  );
}
