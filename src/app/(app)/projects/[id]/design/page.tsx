import { Palette } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectDesignTabStub() {
  return (
    <EmptyState
      icon={Palette}
      title="Design boards coming in Module 7"
      description="Mood boards organized by room with product picks and shopping list."
    />
  )
}
