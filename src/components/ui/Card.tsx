'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Card container variants
 */
const cardVariants = cva(
  'rounded-xl bg-white transition-all duration-200',
  {
    variants: {
      variant: {
        // Default card with subtle shadow
        default: 'shadow-card border border-surface-200/50',
        // Elevated card with stronger shadow
        elevated: 'shadow-soft-md border border-surface-200/50',
        // Flat card without shadow
        flat: 'border border-surface-200',
        // Interactive card with hover effects
        interactive: 'shadow-card border border-surface-200/50 hover:shadow-card-hover hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer',
        // Outlined card
        outlined: 'border-2 border-surface-300',
        // Ghost card (transparent background)
        ghost: 'bg-transparent',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Whether the card should take full height */
  fullHeight?: boolean;
}

/**
 * Card component for containing content
 * 
 * @example
 * // Default card
 * <Card>
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 * </Card>
 * 
 * @example
 * // Interactive card
 * <Card variant="interactive" onClick={() => console.log('clicked')}>
 *   Clickable content
 * </Card>
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, fullHeight = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding }),
          fullHeight && 'h-full',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

/**
 * Card Header component
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Show border below header */
    bordered?: boolean;
  }
>(({ className, bordered = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between space-x-4',
      bordered && 'border-b border-surface-200 pb-4 mb-4',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'Card.Header';

/**
 * Card Title component
 */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  }
>(({ className, as: Component = 'h3', ...props }, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-lg font-semibold text-surface-900',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'Card.Title';

/**
 * Card Description component
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-surface-500', className)}
    {...props}
  />
));
CardDescription.displayName = 'Card.Description';

/**
 * Card Body component
 */
const CardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1', className)} {...props} />
));
CardBody.displayName = 'Card.Body';

/**
 * Card Footer component
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Show border above footer */
    bordered?: boolean;
  }
>(({ className, bordered = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-end space-x-3',
      bordered && 'border-t border-surface-200 pt-4 mt-4',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'Card.Footer';

/**
 * Card Image component
 */
const CardImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement> & {
    /** Alt text for accessibility */
    alt: string;
    /** Aspect ratio for the image container */
    aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9';
  }
>(({ className, aspectRatio = '16:9', alt, ...props }, ref) => {
  const aspectRatioClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    '21:9': 'aspect-[21/9]',
  };

  return (
    <div className={cn('overflow-hidden rounded-t-xl', aspectRatioClasses[aspectRatio])}>
      <img
        ref={ref}
        className={cn('h-full w-full object-cover', className)}
        alt={alt}
        {...props}
      />
    </div>
  );
});
CardImage.displayName = 'Card.Image';

// Compound component pattern
const CardCompound = Object.assign(Card, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Body: CardBody,
  Footer: CardFooter,
  Image: CardImage,
});

export {
  CardCompound as Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  CardImage,
  cardVariants,
};