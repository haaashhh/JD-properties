'use client'

import { useTransition } from 'react'
import { Archive, MoreHorizontal, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { archiveDealAnalysis, restoreDealAnalysis } from '../actions'

export function DealActionsMenu({
  dealId,
  isArchived,
}: {
  dealId: string
  isArchived: boolean
}) {
  const [pending, startTransition] = useTransition()

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveDealAnalysis(dealId)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Deal archived.')
      }
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreDealAnalysis(dealId)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Deal restored.')
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" disabled={pending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {isArchived ? (
          <DropdownMenuItem onClick={handleRestore}>
            <RotateCcw className="h-4 w-4" />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
