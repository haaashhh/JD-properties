'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(120),
})

export type SignupState = { error: string | null; needsVerification?: boolean }

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  })
  if (!parsed.success) {
    return { error: 'Enter your name, a valid email, and a password of at least 8 characters.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback`,
    },
  })
  if (error) {
    return { error: error.message }
  }

  // If email confirmation is required, the session is null until they verify.
  if (!data.session) {
    return { error: null, needsVerification: true }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
