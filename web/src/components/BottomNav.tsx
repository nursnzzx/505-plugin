'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, User, Newspaper } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/apps', label: 'Apps', icon: LayoutGrid },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/news', label: 'News', icon: Newspaper },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
      <div className="glass flex items-center justify-around rounded-2xl px-2 py-2 shadow-card">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => haptic('light')}
              className="relative flex flex-1 flex-col items-center gap-1 py-1.5"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-accent/12"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                size={21}
                className={cn('relative z-10 transition-colors', active ? 'text-accent' : 'text-muted')}
              />
              <span
                className={cn(
                  'relative z-10 text-[10px] font-medium transition-colors',
                  active ? 'text-accent' : 'text-muted',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
