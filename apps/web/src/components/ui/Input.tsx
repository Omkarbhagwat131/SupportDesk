import { forwardRef, useId, type InputHTMLAttributes } from "react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  helperText?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, id, required, className = "", ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = error
    ? `${inputId}-error`
    : helperText
      ? `${inputId}-helper`
      : undefined;

  return (
    <div className={`ui-field ${className}`}>
      <label htmlFor={inputId}>
        {label}
        {required && <span className="required-marker" aria-label="required"> *</span>}
      </label>
      <input
        {...props}
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        className={error ? "ui-input ui-input-error" : "ui-input"}
      />
      {error ? (
        <span id={`${inputId}-error`} className="field-error" role="alert">{error}</span>
      ) : helperText ? (
        <span id={`${inputId}-helper`} className="field-helper">{helperText}</span>
      ) : null}
    </div>
  );
});
