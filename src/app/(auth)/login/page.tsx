import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './login-form'

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await props.searchParams
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          Properties <span className="font-serif italic">by JD</span>
        </CardTitle>
        <CardDescription className="tracking-widest uppercase text-xs">Luxury Living Made Easy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm next={next} />
        <p className="text-center text-sm text-muted-foreground">
          Need an account?{' '}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
