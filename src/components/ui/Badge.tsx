import React from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-gray-300',
  success: 'bg-accent/15 text-accent border border-accent/20',
  warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
  info: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  success: 'bg-accent',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  purple: 'bg-purple-400',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        ${variantClasses[variant]}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`}
        />
      )}
      {children}
    </span>
  );
}
