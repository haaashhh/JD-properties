'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup, type SignupState } from './actions'

const initialState: SignupState = { error: null }

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initialState)

  if (state.needsVerification) {
    return (
      <div className="rounded-md border bg-muted/40 p-4 text-sm">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-muted-foreground">
          We just sent you a verification email. Click the link inside to finish creating your account.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" type="text" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
