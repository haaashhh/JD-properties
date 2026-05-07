'use client'

import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function Topbar({ email, fullName }: { email: string; fullName?: string | null }) {
  const initials = (fullName ?? email).slice(0, 2).toUpperCase()

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search properties, contacts, products…"
          className="pl-9"
          aria-label="Search"
          disabled
        />
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <Button
          nativeButton={false}
          render={
            <Link href="/deals/new">
              <Plus className="h-4 w-4" />
              New Deal
            </Link>
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{fullName ?? 'Account'}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings">Settings</Link>} />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <form action="/logout" method="post" className="w-full">
                  <button type="submit" className="w-full text-left">
                    Sign out
                  </button>
                </form>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
