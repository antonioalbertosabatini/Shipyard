import { Ship } from 'lucide-react'
import { Link } from 'react-router'

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-heading font-semibold">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Ship className="size-4" />
      </span>
      Shipyard
    </Link>
  )
}
