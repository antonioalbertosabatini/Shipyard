import '@/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Controller, useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { IconPicker } from './IconPicker'

/** Mirrors how the form dialogs wire the picker, including the default value. */
function Harness({ initial }: { initial: string }) {
  const { control } = useForm({ defaultValues: { icon: initial } })
  return (
    <Controller
      control={control}
      name="icon"
      render={({ field }) => (
        <>
          <span data-testid="value">{field.value || '(none)'}</span>
          <IconPicker labelId="icon" value={field.value} onChange={field.onChange} />
        </>
      )}
    />
  )
}

describe('IconPicker', () => {
  it('selects an icon', async () => {
    const user = userEvent.setup()
    render(<Harness initial="" />)

    await user.click(screen.getByRole('radio', { name: 'Icon rocket' }))

    expect(screen.getByTestId('value')).toHaveTextContent('rocket')
  })

  // react-hook-form falls back to the default value when a field is set to `undefined`,
  // so clearing has to write an empty string.
  it('clears the selection', async () => {
    const user = userEvent.setup()
    render(<Harness initial="rocket" />)

    await user.click(screen.getByRole('radio', { name: 'No icon' }))

    expect(screen.getByTestId('value')).toHaveTextContent('(none)')
    expect(screen.getByRole('radio', { name: 'No icon' })).toBeChecked()
  })
})
