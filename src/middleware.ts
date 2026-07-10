import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const isAuthPage = pathname.startsWith('/auth')
  const isApiAuth = pathname.startsWith('/api/auth')
  const isApiChat = pathname.startsWith('/api/chat')

  // Allow API auth routes and chat API without auth
  if (isApiAuth || isApiChat) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth/login', req.nextUrl))
  }

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/chat).*)']
}
