import { z } from 'zod'
import { PHOTO_PHASES } from '@/lib/constants'

export const photoInsertSchema = z.object({
  storage_path: z.string().min(1),
  thumbnail_path: z.string().nullable().optional(),
  room_area: z.string().max(80).nullable().optional(),
  phase: z.enum(PHOTO_PHASES).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  taken_at: z.string().datetime().nullable().optional(),
})

export type PhotoInput = z.infer<typeof photoInsertSchema>
export const photoPatchSchema = photoInsertSchema.partial()
export type PhotoPatch = z.infer<typeof photoPatchSchema>
