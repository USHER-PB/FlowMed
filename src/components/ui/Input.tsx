'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Input container variants for different states
 */
const inputVariants = cva(
  'flex w-full rounded-lg border bg-white text-surface-900 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-surface-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
        error: 'border-status-error-500 focus-within:border-status-error-500 focus-within:ring-2 focus-within:ring-status-error-500/20',
        success: 'border-status-success-500 focus-within:border-status-success-500 focus-within:ring-2 focus-within:ring-status-success-500/20',
      },
      inputSize: {
        sm: 'h-8 text-sm',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Label text for the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message (sets variant to error automatically) */
  error?: string;
  /** Success message (sets variant to success automatically) */
  success?: string;
  /** Icon to display on the left side */
  leftIcon?: React.ReactNode;
  /** Icon or element to display on the right side */
  rightIcon?: React.ReactNode;
  /** Additional classes for the input element */
  inputClassName?: string;
  /** Additional classes for the container */
  containerClassName?: string;
  /** Show required indicator */
  required?: boolean;
}

/**
 * Input component for form fields
 * 
 * @example
 * // Basic input
 * <Input label="Email" placeholder="Enter your email" />
 * 
 * @example
 * // With error
 * <Input label="Email" error="Invalid email address" />
 * 
 * @example
 * // With icons
 * <Input leftIcon={<MailIcon />} rightIcon={<CheckIcon />} placeholder="Email" />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputClassName,
      containerClassName,
      variant,
      inputSize,
      label,
      helperText,
      error,
      success,
      leftIcon,
      rightIcon,
      required,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    // Determine variant based on error/success props
    const computedVariant = error ? 'error' : success ? 'success' : variant;
    
    // Generate unique ID if not provided
    const inputId = id || `input-${React.useId()}`;
    
    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-surface-700"
          >
            {label}
            {required && <span className="ml-1 text-status-error-500">*</span>}
          </label>
        )}
        
        <div className={cn(inputVariants({ variant: computedVariant, inputSize }), disabled && 'cursor-not-allowed bg-surface-50 opacity-60', className)}>
          {leftIcon && (
            <div className="flex items-center pl-3 text-surface-400">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'flex-1 bg-transparent px-3 py-2 text-surface-900 placeholder:text-surface-400 focus:outline-none disabled:cursor-not-allowed',
              leftIcon && 'pl-1',
              rightIcon && 'pr-1',
              inputClassName
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          
          {rightIcon && (
            <div className="flex items-center pr-3 text-surface-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-status-error-600">
            {error}
          </p>
        )}
        
        {/* Success message */}
        {success && !error && (
          <p className="mt-1.5 text-sm text-status-success-600">
            {success}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && !success && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-surface-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

/**
 * Textarea component for multi-line text input
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text for the textarea */
  label?: string;
  /** Helper text displayed below the textarea */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Success message */
  success?: string;
  /** Additional classes for the textarea element */
  textareaClassName?: string;
  /** Additional classes for the container */
  containerClassName?: string;
  /** Show required indicator */
  required?: boolean;
  /** Minimum height in rows */
  minRows?: number;
  /** Maximum height in rows */
  maxRows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      textareaClassName,
      containerClassName,
      label,
      helperText,
      error,
      success,
      required,
      id,
      disabled,
      minRows = 3,
      maxRows,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${React.useId()}`;
    
    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-surface-700"
          >
            {label}
            {required && <span className="ml-1 text-status-error-500">*</span>}
          </label>
        )}
        
        <div
          className={cn(
            'flex w-full rounded-lg border bg-white transition-all duration-200',
            error
              ? 'border-status-error-500 focus-within:border-status-error-500 focus-within:ring-2 focus-within:ring-status-error-500/20'
              : success
              ? 'border-status-success-500 focus-within:border-status-success-500 focus-within:ring-2 focus-within:ring-status-success-500/20'
              : 'border-surface-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
            disabled && 'cursor-not-allowed bg-surface-50 opacity-60',
            className
          )}
        >
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled}
            rows={minRows}
            className={cn(
              'flex-1 w-full bg-transparent px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none disabled:cursor-not-allowed',
              textareaClassName
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
            }
            {...props}
          />
        </div>
        
        {error && (
          <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-status-error-600">
            {error}
          </p>
        )}
        
        {success && !error && (
          <p className="mt-1.5 text-sm text-status-success-600">
            {success}
          </p>
        )}
        
        {helperText && !error && !success && (
          <p id={`${textareaId}-helper`} className="mt-1.5 text-sm text-surface-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

/**
 * Select component for dropdown selections
 */
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Label text for the select */
  label?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Success message */
  success?: string;
  /** Options for the select */
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Placeholder text */
  placeholder?: string;
  /** Additional classes for the select element */
  selectClassName?: string;
  /** Additional classes for the container */
  containerClassName?: string;
  /** Show required indicator */
  required?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      selectClassName,
      containerClassName,
      label,
      helperText,
      error,
      success,
      options,
      placeholder,
      required,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${React.useId()}`;
    
    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-surface-700"
          >
            {label}
            {required && <span className="ml-1 text-status-error-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              'w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-sm text-surface-900 transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
              error
                ? 'border-status-error-500 focus:border-status-error-500 focus:ring-2 focus:ring-status-error-500/20'
                : success
                ? 'border-status-success-500 focus:border-status-success-500 focus:ring-2 focus:ring-status-success-500/20'
                : 'border-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
              disabled && 'bg-surface-50',
              selectClassName
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Dropdown arrow icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        
        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-sm text-status-error-600">
            {error}
          </p>
        )}
        
        {success && !error && (
          <p className="mt-1.5 text-sm text-status-success-600">
            {success}
          </p>
        )}
        
        {helperText && !error && !success && (
          <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-surface-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

/**
 * Checkbox component
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label text for the checkbox */
  label?: string;
  /** Helper text displayed below the checkbox */
  helperText?: string;
  /** Error message */
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, helperText, error, id, disabled, ...props }, ref) => {
    const checkboxId = id || `checkbox-${React.useId()}`;
    
    return (
      <div className={cn('flex items-start', className)}>
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            className={cn(
              'h-4 w-4 rounded border transition-colors focus:ring-2 focus:ring-brand-500/20',
              error
                ? 'border-status-error-500 text-status-error-500 focus:ring-status-error-500/20'
                : 'border-surface-300 text-brand-500',
              disabled && 'cursor-not-allowed opacity-60'
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined}
            {...props}
          />
        </div>
        
        {(label || helperText || error) && (
          <div className="ml-2.5">
            {label && (
              <label htmlFor={checkboxId} className="text-sm font-medium text-surface-700">
                {label}
              </label>
            )}
            
            {error && (
              <p id={`${checkboxId}-error`} className="text-sm text-status-error-600">
                {error}
              </p>
            )}
            
            {helperText && !error && (
              <p id={`${checkboxId}-helper`} className="text-sm text-surface-500">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Input, Textarea, Select, Checkbox, inputVariants };