import { ChevronDown } from 'lucide-react';
import { useId, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption<TValue extends string> {
  value: TValue;
  label: string;
  disabled?: boolean;
  /** Optional description rendered as the option's secondary line in custom menus. */
  hint?: string;
}

const FIELD_HEIGHTS: Record<SelectSize, string> = {
  sm: 'min-h-[44px] text-sm',
  md: 'min-h-[48px] text-sm',
  lg: 'min-h-[52px] text-base',
};

export interface SelectProps<TValue extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'onChange' | 'value' | 'size'> {
  /** Visible label. */
  label: string;
  hideLabel?: boolean;
  /** Supporting copy rendered under the control. */
  helperText?: string;
  error?: string;
  /** Icon rendered inside the control before the selected value. */
  leadingIcon?: ReactNode;
  /** First, non-selectable option used as the empty/default state. */
  placeholder?: string;
  options: readonly SelectOption<TValue>[];
  value: TValue;
  onValueChange: (value: TValue) => void;
  size?: SelectSize;
  fullWidth?: boolean;
  className?: string;
  wrapperClassName?: string;
  testId?: string;
}

/**
 * Native select styled to the design system.
 *
 * A native element keeps platform picker behaviour on mobile, keyboard support
 * and screen reader semantics without re-implementing a listbox.
 */
export function Select<TValue extends string>({
  label,
  hideLabel = false,
  helperText,
  error,
  leadingIcon,
  placeholder,
  options,
  value,
  onValueChange,
  size = 'md',
  fullWidth = true,
  className,
  wrapperClassName,
  testId,
  id,
  disabled,
  required,
  ...rest
}: SelectProps<TValue>): React.JSX.Element {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const describedBy = [helperText ? helperId : null, error ? errorId : null].filter(Boolean).join(' ');

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onValueChange(event.target.value as TValue);
  };

  const isEmpty = value === '';

  return (
    <div className={cn(fullWidth ? 'w-full' : 'w-auto', wrapperClassName)}>
      <label
        htmlFor={selectId}
        className={cn(
          'mb-1.5 block text-sm font-medium',
          error ? 'text-rose-300' : 'text-slate-300',
          hideLabel && 'sr-only'
        )}
      >
        {label}
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

        <select
          {...rest}
          id={selectId}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy.length > 0 ? describedBy : undefined}
          data-testid={testId}
          className={cn(
            'w-full appearance-none rounded-xl border bg-slate-900/70 px-3.5 pr-10 text-slate-100 transition-colors',
            'focus:border-emerald-400 focus:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60',
            FIELD_HEIGHTS[size],
            leadingIcon && 'pl-10',
            isEmpty ? 'text-slate-500' : 'text-slate-100',
            error ? 'border-rose-500/70' : 'border-slate-700 hover:border-slate-600',
            className
          )}
        >
          {placeholder ? (
            <option value="" disabled={required === true}>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled ?? false} className="bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />
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