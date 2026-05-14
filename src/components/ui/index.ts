/**
 * UI Components - Design System
 *
 * This module exports all reusable UI components following
 * a consistent design system for the FlowMed application.
 */

// Button components
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

// Card components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  CardImage,
  cardVariants,
} from './Card';
export type { CardProps } from './Card';

// Badge components
export {
  Badge,
  StatusBadge,
  AppointmentStatusBadge,
  PriorityBadge,
  badgeVariants,
} from './Badge';
export type { BadgeProps } from './Badge';

// Input components
export {
  Input,
  Textarea,
  Select,
  Checkbox,
  inputVariants,
} from './Input';
export type { InputProps, TextareaProps, SelectProps, CheckboxProps } from './Input';