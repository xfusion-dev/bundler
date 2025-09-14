/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const cardVariants = cva(
  [
    'rounded-2xl border transition-all duration-300',
    'relative overflow-hidden',
    'transform-gpu', // GPU acceleration
  ],
  {
    variants: {
      variant: {
        // Default glass card
        default: [
          'bg-white/60 backdrop-blur-xl',
          'border-white/20 shadow-xl shadow-black/5',
          'hover:bg-white/70 hover:shadow-2xl',
        ],
        
        // Elevated card with strong shadow
        elevated: [
          'bg-white border-gray-200',
          'shadow-2xl shadow-black/10',
          'hover:shadow-3xl hover:-translate-y-1',
        ],
        
        // Glass morphism card
        glass: [
          'bg-white/10 backdrop-blur-2xl',
          'border-white/20 shadow-xl shadow-black/10',
          'hover:bg-white/20 hover:border-white/30',
        ],
        
        // Gradient card
        gradient: [
          'bg-gradient-to-br from-blue-50 via-white to-purple-50',
          'border-blue-200/50 shadow-xl shadow-blue-500/10',
          'hover:shadow-2xl hover:shadow-blue-500/20',
        ],
        
        // Dark card
        dark: [
          'bg-slate-900/90 backdrop-blur-xl',
          'border-slate-700/50 text-white',
          'shadow-2xl shadow-black/20',
          'hover:bg-slate-800/90',
        ],
        
        // Premium card with glow
        premium: [
          'bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50',
          'border-blue-200/30 shadow-2xl',
          'shadow-blue-500/10 hover:shadow-blue-500/20',
          'hover:shadow-3xl hover:-translate-y-1',
          'relative',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      hover: {
        none: '',
        lift: 'hover:-translate-y-2 hover:scale-[1.02]',
        glow: 'hover:shadow-2xl hover:shadow-primary/20',
        scale: 'hover:scale-105',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
      hover: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  clickable?: boolean;
  loading?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    padding, 
    hover, 
    clickable = false,
    loading = false,
    children,
    ...props 
  }, ref) => {
    const { onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...divProps } = props;

    return (
      <motion.div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, hover, className }),
          clickable && 'cursor-pointer',
          loading && 'animate-pulse'
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={clickable ? { y: -4, scale: 1.02 } : undefined}
        whileTap={clickable ? { scale: 0.98 } : undefined}
        {...divProps}
      >
        {/* Premium glow effect for premium variant */}
        {variant === 'premium' && (
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-0 hover:opacity-20 transition-opacity duration-300 blur-xl" />
        )}
        
        {/* Shimmer loading effect */}
        {loading && (
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components for better organization
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-6', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants 
}; 