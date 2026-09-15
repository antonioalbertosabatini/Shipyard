import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { Trash2 } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Controller, useForm, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ResponsiveDialog } from '@/components/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type TaskStatus,
} from '@/domain/constants'
import {
  taskPrioritySchema,
  taskStatusSchema,
  taskTypeSchema,
  type Task,
  type TaskInput,
} from '@/domain/schemas'
import { useCreateTask, useDeleteTask, useUpdateTask } from './hooks'
import { TASK_PRIORITY_STYLES, TASK_STATUS_STYLES, TASK_TYPE_STYLES } from './taskStyles'

function makeSchema(t: TFunction) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, t('validation.required'))
      .max(200, t('validation.tooLong', { max: 200 })),
    description: z.string().max(10000, t('validation.tooLong', { max: 10000 })),
    type: taskTypeSchema,
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    dueDate: z.union([z.literal(''), z.iso.date()]),
  })
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>

const toInput = (values: FormValues): TaskInput => ({
  title: values.title.trim(),
  description: values.description.trim() || undefined,
  type: values.type,
  status: values.status,
  priority: values.priority,
  dueDate: values.dueDate || undefined,
})

const OPTIONS = {
  type: { values: TASK_TYPES, styles: TASK_TYPE_STYLES, iconTone: false },
  status: { values: TASK_STATUSES, styles: TASK_STATUS_STYLES, iconTone: true },
  priority: { values: TASK_PRIORITIES, styles: TASK_PRIORITY_STYLES, iconTone: true },
} as const

function EnumSelect({
  id,
  name,
  control,
}: {
  id: string
  name: keyof typeof OPTIONS
  control: Control<FormValues>
}) {
  const { t } = useTranslation()
  const { values, styles, iconTone } = OPTIONS[name]
  return (
    <Field>
      <FieldLabel htmlFor={`${id}-${name}`}>{t(`task.fields.${name}`)}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={`${id}-${name}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {values.map((value) => {
                const style = styles[value as keyof typeof styles] as {
                  icon: React.ComponentType<{ className?: string }>
                  className: string
                }
                const Icon = style.icon
                return (
                  <SelectItem key={value} value={value}>
                    <Icon className={iconTone ? style.className : undefined} />
                    {t(`task.${name}.${value}` as `task.type.feature`)}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  )
}

function TaskForm({
  id,
  task,
  defaultStatus,
  onSubmit,
}: {
  id: string
  task?: Task
  defaultStatus: TaskStatus
  onSubmit: (input: TaskInput) => void
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
      title: task?.title ?? '',
      description: task?.description ?? '',
      type: task?.type ?? 'feature',
      status: task?.status ?? defaultStatus,
      priority: task?.priority ?? 'medium',
      dueDate: task?.dueDate ?? '',
    },
  })

  return (
    <form id={id} onSubmit={handleSubmit((values) => onSubmit(toInput(values)))} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor={`${id}-title`}>{t('task.fields.title')}</FieldLabel>
          <Input
            id={`${id}-title`}
            placeholder={t('task.fields.titlePlaceholder')}
            aria-invalid={!!errors.title}
            {...register('title')}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <EnumSelect id={id} name="type" control={control} />
          <EnumSelect id={id} name="status" control={control} />
          <EnumSelect id={id} name="priority" control={control} />
          <Field data-invalid={!!errors.dueDate}>
            <FieldLabel htmlFor={`${id}-due`}>{t('task.fields.dueDate')}</FieldLabel>
            <Input id={`${id}-due`} type="date" {...register('dueDate')} />
            <FieldError errors={[errors.dueDate]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor={`${id}-description`}>{t('task.fields.description')}</FieldLabel>
          <Textarea
            id={`${id}-description`}
            rows={5}
            placeholder={t('task.fields.descriptionPlaceholder')}
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>
    </form>
  )
}

export function TaskFormDialog({
  projectId,
  open,
  onOpenChange,
  task,
  defaultStatus = 'todo',
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this task; omit to create a new one. */
  task?: Task
  defaultStatus?: TaskStatus
}) {
  const { t } = useTranslation()
  const formId = useId()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const create = useCreateTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const pending = create.isPending || update.isPending

  const handleSubmit = (input: TaskInput) => {
    const onSuccess = () => {
      toast.success(t(task ? 'task.updated' : 'task.created'))
      onOpenChange(false)
    }
    if (task) update.mutate({ id: task.id, input }, { onSuccess })
    else create.mutate({ projectId, input }, { onSuccess })
  }

  const handleDelete = () => {
    if (!task) return
    onOpenChange(false)
    remove
      .mutateAsync(task.id)
      .then(() => toast.success(t('task.deleted')))
      .catch(() => {})
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t(task ? 'task.editTitle' : 'task.createTitle')}
        footer={
          <>
            {task && (
              <Button
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 data-icon="inline-start" />
                {t('common.delete')}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form={formId} disabled={pending}>
              {t(task ? 'common.save' : 'common.create')}
            </Button>
          </>
        }
      >
        <TaskForm
          key={task?.id ?? 'new'}
          id={formId}
          task={task}
          defaultStatus={defaultStatus}
          onSubmit={handleSubmit}
        />
      </ResponsiveDialog>

      {task && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('task.deleteTitle')}
          description={t('task.deleteDescription', { title: task.title })}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
