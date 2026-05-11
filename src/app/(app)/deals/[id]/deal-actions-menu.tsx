'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, FolderKanban, MoreHorizontal, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  archiveDealAnalysis,
  promoteDealToProject,
  restoreDealAnalysis,
} from '../actions'

export function DealActionsMenu({
  dealId,
  isArchived,
}: {
  dealId: string
  isArchived: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handlePromote = () => {
    startTransition(async () => {
      const result = await promoteDealToProject(dealId)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Project created.')
        router.push(`/projects/${result.projectId}`)
      }
    })
  }

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
        {!isArchived ? (
          <>
            <DropdownMenuItem onClick={handlePromote}>
              <FolderKanban className="h-4 w-4" />
              Promote to project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={handleRestore}>
            <RotateCcw className="h-4 w-4" />
            Restore
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
