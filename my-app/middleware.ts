import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Get all cookies for debugging
  const allCookies = request.cookies.getAll()
  console.log('=== MIDDLEWARE DEBUG ===')
  console.log('Path:', path)
  console.log('All cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))

  // Check for any Supabase auth cookie pattern
  const hasAuthCookie = allCookies.some(cookie => 
    cookie.name.startsWith('sb-') && (
      cookie.name.includes('-auth-token') || 
      cookie.name.endsWith('-auth-token') ||
      cookie.name.includes('auth')
    )
  )

  console.log('Has auth cookie:', hasAuthCookie)
  console.log('Auth cookies found:', allCookies.filter(c => c.name.startsWith('sb-')).map(c => c.name))

  const isPublicPath = path === '/login'

  // Redirect to login if accessing protected route without auth cookie
  if (!isPublicPath && !hasAuthCookie) {
    console.log('Redirecting to login - no auth cookie')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect to products if accessing login with auth cookie
  if (isPublicPath && hasAuthCookie) {
    console.log('Redirecting to products - has auth cookie')
    return NextResponse.redirect(new URL('/dashboard/products', request.url))
  }

  console.log('Allowing request to proceed')
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login']
}
