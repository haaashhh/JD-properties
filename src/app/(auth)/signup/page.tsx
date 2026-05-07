import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignupForm } from './signup-form'

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          Properties <span className="font-serif italic">by JD</span>
        </CardTitle>
        <CardDescription className="tracking-widest uppercase text-xs">Luxury Living Made Easy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
