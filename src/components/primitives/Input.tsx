import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type InputSize = 'sm' | 'md' | 'lg';

const FIELD_HEIGHTS: Record<InputSize, string> = {
  sm: 'min-h-[44px] text-sm',
  md: 'min-h-[48px] text-sm',
  lg: 'min-h-[52px] text-base',
};

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'className' | 'onChange'> {
  /** Visible label; always rendered to keep the field accessible. */
  label: string;
  /** Hide the label visually while keeping it for assistive technology. */
  hideLabel?: boolean;
  /** Supporting copy rendered under the field when there is no error. */
  helperText?: string;
  /** Error message; also switches the field into the invalid state. */
  error?: string;
  /** Icon rendered inside the field, before the text (e.g. a search glass). */
  leadingIcon?: ReactNode;
  /** Trailing affordance (clear button, counter, unit suffix). */
  trailingSlot?: ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
  /** Controlled value. */
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  testId?: string;
}

/**
 * Controlled text field with leading icon support, inline validation messaging
 * and mobile-first 48px touch targets.
 */
export function Input({
  label,
  hideLabel = false,
  helperText,
  error,
  leadingIcon,
  trailingSlot,
  size = 'md',
  fullWidth = true,
  value,
  onValueChange,
  className,
  wrapperClassName,
  inputClassName,
  testId,
  id,
  disabled,
  required,
  ...rest
}: InputProps): React.JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [helperText ? helperId : null, error ? errorId : null].filter(Boolean).join(' ');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onValueChange(event.target.value);
  };

  return (
    <div className={cn(fullWidth ? 'w-full' : 'w-auto', wrapperClassName)}>
      <label
        htmlFor={inputId}
        className={cn(
          'mb-1.5 block text-sm font-medium',
          error ? 'text-rose-300' : 'text-slate-300',
          hideLabel && 'sr-only'
        )}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-rose-400">
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        {leadingIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          >
            {leadingIcon}
          </span>
        ) : null}

        <input
          {...rest}
          id={inputId}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy.length > 0 ? describedBy : undefined}
          data-testid={testId}
          className={cn(
            'w-full rounded-xl border bg-slate-900/70 px-3.5 text-slate-100 transition-colors placeholder:text-slate-500',
            'focus:border-emerald-400 focus:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60',
            FIELD_HEIGHTS[size],
            leadingIcon && 'pl-10',
            trailingSlot && 'pr-11',
            error ? 'border-rose-500/70' : 'border-slate-700 hover:border-slate-600',
            inputClassName
          )}
        />

        {trailingSlot ? (
          <span className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-slate-400">
            {trailingSlot}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-rose-300">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}