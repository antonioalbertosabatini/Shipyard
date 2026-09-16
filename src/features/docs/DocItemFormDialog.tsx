import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { Trash2 } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
import { DOC_ITEM_TYPES } from '@/domain/constants'
import { docItemTypeSchema, webUrlSchema, type DocItem, type DocItemInput } from '@/domain/schemas'
import { cn } from '@/lib/utils'
import { DOC_ITEM_TYPE_STYLES } from './docStyles'
import { useCreateDocItem, useDeleteDocItem, useUpdateDocItem } from './hooks'

function makeSchema(t: TFunction) {
  return z
    .object({
      type: docItemTypeSchema,
      content: z
        .string()
        .trim()
        .min(1, t('validation.required'))
        .max(2000, t('validation.tooLong', { max: 2000 })),
      description: z.string().max(2000, t('validation.tooLong', { max: 2000 })),
    })
    .refine((values) => values.type !== 'link' || webUrlSchema.safeParse(values.content).success, {
      path: ['content'],
      error: t('validation.url'),
    })
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>

const toInput = (values: FormValues): DocItemInput => ({
  type: values.type,
  content: values.content.trim(),
  description: values.description.trim() || undefined,
})

function DocItemForm({
  id,
  item,
  onSubmit,
}: {
  id: string
  item?: DocItem
  onSubmit: (input: DocItemInput) => void
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
      type: item?.type ?? 'link',
      content: item?.content ?? '',
      description: item?.description ?? '',
    },
  })
  // The content field's label, placeholder and keyboard follow the selected type.
  const type = useWatch({ control, name: 'type' })

  return (
    <form id={id} onSubmit={handleSubmit((values) => onSubmit(toInput(values)))} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-type`}>{t('doc.fields.type')}</FieldLabel>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={`${id}-type`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_ITEM_TYPES.map((value) => {
                    const { icon: Icon } = DOC_ITEM_TYPE_STYLES[value]
                    return (
                      <SelectItem key={value} value={value}>
                        <Icon />
                        {t(`doc.type.${value}`)}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field data-invalid={!!errors.content}>
          <FieldLabel htmlFor={`${id}-content`}>{t(`doc.content.${type}`)}</FieldLabel>
          <Input
            id={`${id}-content`}
            inputMode={type === 'link' ? 'url' : 'text'}
            placeholder={t(`doc.contentPlaceholder.${type}`)}
            aria-invalid={!!errors.content}
            className={cn(type === 'command' && 'font-mono')}
            {...register('content')}
          />
          <FieldError errors={[errors.content]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor={`${id}-description`}>{t('doc.fields.description')}</FieldLabel>
          <Textarea
            id={`${id}-description`}
            rows={4}
            placeholder={t('doc.fields.descriptionPlaceholder')}
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>
    </form>
  )
}

export function DocItemFormDialog({
  projectId,
  open,
  onOpenChange,
  item,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this item; omit to create a new one. */
  item?: DocItem
}) {
  const { t } = useTranslation()
  const formId = useId()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const create = useCreateDocItem()
  const update = useUpdateDocItem()
  const remove = useDeleteDocItem()
  const pending = create.isPending || update.isPending

  const handleSubmit = (input: DocItemInput) => {
    const onSuccess = () => {
      toast.success(t(item ? 'doc.updated' : 'doc.created'))
      onOpenChange(false)
    }
    if (item) update.mutate({ id: item.id, input }, { onSuccess })
    else create.mutate({ projectId, input }, { onSuccess })
  }

  const handleDelete = () => {
    if (!item) return
    onOpenChange(false)
    remove
      .mutateAsync(item.id)
      .then(() => toast.success(t('doc.deleted')))
      .catch(() => {})
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t(item ? 'doc.editTitle' : 'doc.createTitle')}
        description={t('doc.formDescription')}
        footer={
          <>
            {item && (
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
              {t(item ? 'common.save' : 'common.create')}
            </Button>
          </>
        }
      >
        <DocItemForm key={item?.id ?? 'new'} id={formId} item={item} onSubmit={handleSubmit} />
      </ResponsiveDialog>

      {item && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('doc.deleteTitle')}
          description={t('doc.deleteDescription', { content: item.content })}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
