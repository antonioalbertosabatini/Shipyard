import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-xl font-semibold">{title}</h1>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {children && <CardContent className="flex flex-col gap-4">{children}</CardContent>}
      {footer && (
        <CardFooter className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
