import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { useId, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { ResponsiveDialog } from '@/components/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_PROJECT_COLOR, PROJECT_COLORS } from '@/domain/constants'
import { webUrlSchema, type Project, type ProjectInput } from '@/domain/schemas'
import { cn } from '@/lib/utils'
import { useCreateProject, useUpdateProject } from './hooks'

function makeSchema(t: TFunction) {
  const optionalUrl = z
    .string()
    .trim()
    .refine((value) => value === '' || webUrlSchema.safeParse(value).success, t('validation.url'))
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('validation.required'))
      .max(100, t('validation.tooLong', { max: 100 })),
    description: z.string().max(2000, t('validation.tooLong', { max: 2000 })),
    color: z.string(),
    repoUrl: optionalUrl,
    liveUrl: optionalUrl,
  })
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>

const toInput = (values: FormValues): ProjectInput => ({
  name: values.name.trim(),
  description: values.description.trim() || undefined,
  color: values.color,
  repoUrl: values.repoUrl.trim() || undefined,
  liveUrl: values.liveUrl.trim() || undefined,
})

function ProjectForm({
  id,
  project,
  onSubmit,
}: {
  id: string
  project?: Project
  onSubmit: (input: ProjectInput) => void
}) {
  const { t } = useTranslation()
  const schema = useMemo(() => makeSchema(t), [t])
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      color: project?.color ?? DEFAULT_PROJECT_COLOR,
      repoUrl: project?.repoUrl ?? '',
      liveUrl: project?.liveUrl ?? '',
    },
  })

  return (
    <form id={id} onSubmit={handleSubmit((values) => onSubmit(toInput(values)))} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor={`${id}-name`}>{t('project.fields.name')}</FieldLabel>
          <Input
            id={`${id}-name`}
            placeholder={t('project.fields.namePlaceholder')}
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor={`${id}-description`}>{t('project.fields.description')}</FieldLabel>
          <Textarea
            id={`${id}-description`}
            rows={3}
            placeholder={t('project.fields.descriptionPlaceholder')}
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field>
          <FieldLabel id={`${id}-color`} asChild>
            <span>{t('project.fields.color')}</span>
          </FieldLabel>
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <div role="radiogroup" aria-labelledby={`${id}-color`} className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={field.value === color}
                    aria-label={t('project.colorLabel', { color })}
                    onClick={() => field.onChange(color)}
                    className={cn(
                      'size-7 rounded-full ring-offset-2 ring-offset-background transition outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      field.value === color && 'ring-2 ring-foreground',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.repoUrl}>
            <FieldLabel htmlFor={`${id}-repo`}>{t('project.fields.repoUrl')}</FieldLabel>
            <Input
              id={`${id}-repo`}
              type="url"
              inputMode="url"
              placeholder="https://github.com/…"
              aria-invalid={!!errors.repoUrl}
              {...register('repoUrl')}
            />
            <FieldError errors={[errors.repoUrl]} />
          </Field>
          <Field data-invalid={!!errors.liveUrl}>
            <FieldLabel htmlFor={`${id}-live`}>{t('project.fields.liveUrl')}</FieldLabel>
            <Input
              id={`${id}-live`}
              type="url"
              inputMode="url"
              placeholder="https://…"
              aria-invalid={!!errors.liveUrl}
              {...register('liveUrl')}
            />
            <FieldError errors={[errors.liveUrl]} />
          </Field>
        </div>
      </FieldGroup>
    </form>
  )
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this project; omit to create a new one. */
  project?: Project
  onSaved?: (project: Project) => void
}) {
  const { t } = useTranslation()
  const formId = useId()
  const create = useCreateProject()
  const update = useUpdateProject()
  const pending = create.isPending || update.isPending

  const handleSubmit = (input: ProjectInput) => {
    const onSuccess = (saved: Project) => {
      toast.success(t(project ? 'project.updated' : 'project.created'))
      onOpenChange(false)
      onSaved?.(saved)
    }
    if (project) update.mutate({ id: project.id, input }, { onSuccess })
    else create.mutate(input, { onSuccess })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(project ? 'project.editTitle' : 'project.createTitle')}
      description={project ? undefined : t('project.createDescription')}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {t(project ? 'common.save' : 'common.create')}
          </Button>
        </>
      }
    >
      <ProjectForm id={formId} project={project} onSubmit={handleSubmit} />
    </ResponsiveDialog>
  )
}
