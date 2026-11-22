import { ElementType, HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  padding?: 'default' | 'compact' | 'none';
  variant?: 'default' | 'alert' | 'modal';
}

export function GlassCard({
  as: Component = 'div',
  children,
  padding = 'default',
  variant = 'default',
  className = '',
  ...rest
}: GlassCardProps) {
  const variantClass =
    variant === 'alert'
      ? 'glass-alert'
      : variant === 'modal'
        ? 'glass-modal'
        : 'glass';

  const paddingClass =
    padding === 'default'
      ? 'p-5 sm:p-6'
      : padding === 'compact'
        ? 'p-4 sm:p-5'
        : '';

  return (
    <Component
      className={`${variantClass} min-w-0 max-w-full ${paddingClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
}
