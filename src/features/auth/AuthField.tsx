import type { ComponentProps, ReactNode } from 'react'
import type { FieldError as FormFieldError } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/** Labelled input with validation message; spread `register(name)` into it. */
export function AuthField({
  id,
  label,
  error,
  action,
  ...inputProps
}: ComponentProps<'input'> & {
  id: string
  label: ReactNode
  error?: FormFieldError
  /** Rendered next to the label (e.g. a "Forgot password?" link). */
  action?: ReactNode
}) {
  return (
    <Field data-invalid={!!error}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {action}
      </div>
      <Input id={id} aria-invalid={!!error} {...inputProps} />
      <FieldError errors={[error]} />
    </Field>
  )
}
