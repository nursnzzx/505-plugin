'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0..1
  className?: string;
  danger?: boolean;
}

export function ProgressBar({ value, className, danger }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className={cn(
          'h-full rounded-full',
          danger ? 'bg-gradient-to-r from-red-500 to-orange-400' : 'bg-green-gradient shadow-glow',
        )}
      />
    </div>
  );
}
