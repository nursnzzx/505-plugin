'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="card flex flex-col gap-2 p-4"
    >
      <Icon size={18} className="text-accent" />
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-[11px] leading-tight text-muted">{label}</span>
    </motion.div>
  );
}
