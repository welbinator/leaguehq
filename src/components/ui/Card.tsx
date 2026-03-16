import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`
        bg-surface border border-white/[0.06] rounded-2xl
        ${hover ? 'transition-all duration-200 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}
