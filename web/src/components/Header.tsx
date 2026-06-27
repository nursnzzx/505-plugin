'use client';

import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import type { License, User } from '@/lib/types';
import { cn, tierColor } from '@/lib/utils';

export function Header({ user, license }: { user: User | null; license: License | null }) {
  const initials = (user?.fullName ?? 'KT')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3"
    >
      <div className="relative">
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-12 w-12 rounded-2xl object-cover ring-2 ring-accent/40"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-gradient text-base font-bold text-black">
            {initials}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg bg-accent" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">{user?.fullName ?? 'Welcome'}</p>
        <p className="truncate text-xs text-muted">
          {user?.username ? `@${user.username}` : 'KantTools member'}
        </p>
      </div>

      <div
        className={cn(
          'chip gap-1.5 bg-white/5 text-sm font-semibold',
          tierColor(license?.tier ?? 'FREE'),
        )}
      >
        {license?.tier === 'ULTIMATE' ? <Crown size={15} /> : <Sparkles size={15} />}
        {license?.tier ?? 'FREE'}
      </div>
    </motion.header>
  );
}
