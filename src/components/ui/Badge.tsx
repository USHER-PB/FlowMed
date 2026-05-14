'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge variants for different use cases
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        // Default - subtle background
        default: 'bg-surface-100 text-surface-700',
        // Primary brand color
        primary: 'bg-brand-100 text-brand-700',
        // Secondary style
        secondary: 'bg-surface-200 text-surface-800',
        // Success/positive status
        success: 'bg-status-success-100 text-status-success-700',
        // Warning/caution status
        warning: 'bg-status-warning-100 text-status-warning-700',
        // Error/danger status
        error: 'bg-status-error-100 text-status-error-700',
        // Information status
        info: 'bg-status-info-100 text-status-info-700',
        // Outline style
        outline: 'bg-transparent border border-current',
        // Solid variants
        'solid-primary': 'bg-brand-500 text-white',
        'solid-success': 'bg-status-success-500 text-white',
        'solid-warning': 'bg-status-warning-500 text-white',
        'solid-error': 'bg-status-error-500 text-white',
        'solid-info': 'bg-status-info-500 text-white',
      },
      size: {
        xs: 'px-2 py-0.5 text-xs',
        sm: 'px-2.5 py-0.5 text-xs',
        md: 'px-3 py-1 text-xs',
        lg: 'px-3.5 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional icon to display before the text */
  leftIcon?: React.ReactNode;
  /** Optional icon to display after the text */
  rightIcon?: React.ReactNode;
  /** Dot indicator for status badges */
  dot?: boolean;
  /** Dot color override */
  dotColor?: string;
}

/**
 * Badge component for status indicators and labels
 * 
 * @example
 * // Status badge
 * <Badge variant="success">Active</Badge>
 * 
 * @example
 * // With dot indicator
 * <Badge variant="success" dot>Online</Badge>
 * 
 * @example
 * // With icons
 * <Badge variant="info" leftIcon={<InfoIcon />}>Information</Badge>
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      leftIcon,
      rightIcon,
      dot = false,
      dotColor,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              dotColor || 'bg-current'
            )}
            aria-hidden="true"
          />
        )}
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

/**
 * Status Badge - Pre-configured badges for common statuses
 */
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'error' | 'active' | 'inactive';
}

const STATUS_CONFIG: Record<StatusBadgeProps['status'], { variant: BadgeProps['variant']; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  cancelled: { variant: 'error', label: 'Cancelled' },
  completed: { variant: 'info', label: 'Completed' },
  error: { variant: 'error', label: 'Error' },
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'secondary', label: 'Inactive' },
};

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge ref={ref} variant={config.variant} {...props}>
        {children || config.label}
      </Badge>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

/**
 * Appointment Status Badge - Healthcare-specific status badges
 */
interface AppointmentStatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'PENDING_SUPERVISOR_APPROVAL';
}

const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatusBadgeProps['status'], { variant: BadgeProps['variant']; label: string }> = {
  PENDING: { variant: 'warning', label: 'Pending' },
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  CANCELLED: { variant: 'error', label: 'Cancelled' },
  COMPLETED: { variant: 'info', label: 'Completed' },
  PENDING_SUPERVISOR_APPROVAL: { variant: 'primary', label: 'Awaiting Approval' },
};

const AppointmentStatusBadge = React.forwardRef<HTMLSpanElement, AppointmentStatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const config = APPOINTMENT_STATUS_CONFIG[status];
    return (
      <Badge ref={ref} variant={config.variant} {...props}>
        {children || config.label}
      </Badge>
    );
  }
);
AppointmentStatusBadge.displayName = 'AppointmentStatusBadge';

/**
 * Healthcare Priority Badge - For queue/priority indicators
 */
interface PriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  priority: 'emergency' | 'urgent' | 'normal' | 'low';
}

const PRIORITY_CONFIG: Record<PriorityBadgeProps['priority'], { variant: BadgeProps['variant']; label: string }> = {
  emergency: { variant: 'solid-error', label: 'Emergency' },
  urgent: { variant: 'solid-warning', label: 'Urgent' },
  normal: { variant: 'solid-success', label: 'Normal' },
  low: { variant: 'solid-info', label: 'Low' },
};

const PriorityBadge = React.forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ priority, children, ...props }, ref) => {
    const config = PRIORITY_CONFIG[priority];
    return (
      <Badge ref={ref} variant={config.variant} {...props}>
        {children || config.label}
      </Badge>
    );
  }
);
PriorityBadge.displayName = 'PriorityBadge';

export { Badge, StatusBadge, AppointmentStatusBadge, PriorityBadge, badgeVariants };