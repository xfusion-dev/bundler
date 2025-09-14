/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-xl font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'relative overflow-hidden',
    'transform-gpu', // Enable GPU acceleration
  ],
  {
    variants: {
      variant: {
        // Primary gradient button - the hero
        primary: [
          'bg-gradient-to-r from-blue-500 to-purple-600',
          'text-white shadow-lg shadow-blue-500/25',
          'hover:shadow-xl hover:shadow-blue-500/40',
          'hover:scale-105 active:scale-95',
          'border border-blue-400/20',
        ],
        
        // Secondary glass button
        secondary: [
          'bg-white/10 backdrop-blur-md',
          'text-slate-700 border border-white/20',
          'hover:bg-white/20 hover:border-white/30',
          'shadow-lg shadow-black/5',
        ],
        
        // Outline button
        outline: [
          'border-2 border-blue-200 bg-transparent',
          'text-blue-600 hover:bg-blue-50',
          'hover:border-blue-300 hover:shadow-md',
        ],
        
        // Ghost button
        ghost: [
          'bg-transparent text-slate-600',
          'hover:bg-slate-100 hover:text-slate-900',
        ],
        
        // Success button
        success: [
          'bg-gradient-to-r from-green-500 to-emerald-600',
          'text-white shadow-lg shadow-green-500/25',
          'hover:shadow-xl hover:shadow-green-500/40',
          'hover:scale-105 active:scale-95',
        ],
        
        // Warning button
        warning: [
          'bg-gradient-to-r from-orange-500 to-yellow-600',
          'text-white shadow-lg shadow-orange-500/25',
          'hover:shadow-xl hover:shadow-orange-500/40',
          'hover:scale-105 active:scale-95',
        ],
        
        // Destructive button
        destructive: [
          'bg-gradient-to-r from-red-500 to-pink-600',
          'text-white shadow-lg shadow-red-500/25',
          'hover:shadow-xl hover:shadow-red-500/40',
          'hover:scale-105 active:scale-95',
        ],
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        default: 'h-11 px-6 text-base',
        lg: 'h-12 px-8 text-lg',
        xl: 'h-14 px-10 text-xl',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    const { onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...buttonProps } = props;

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        whileTap={{ scale: 0.95 }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...buttonProps}
      >
        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 -top-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        
        {/* Loading spinner */}
        {loading && (
          <div className="mr-2">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          </div>
        )}
        
        {/* Left icon */}
        {leftIcon && !loading && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* Button content */}
        <span className="flex-1">{children}</span>
        
        {/* Right icon */}
        {rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants }; 