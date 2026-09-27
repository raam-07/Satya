import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  
  // Redirect any visits from the Render subdomain to the custom domain
  if (hostname && hostname.includes('onrender.com')) {
    const url = request.nextUrl.clone()
    url.hostname = 'satyadheesh.in'
    url.port = ''
    return NextResponse.redirect(url, 301)
  }
  
  
  // Basic Auth for Admin Area
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/api/admin')) {
    const basicAuth = request.headers.get('authorization')
    const secret = process.env.REVALIDATE_SECRET
    
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')
      
      // User can be anything, password must match the secret
      if (pwd === secret) {
        return NextResponse.next()
      }
    }
    
    return new NextResponse('Auth Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Admin Area"' },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - metadata/favicon files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|favicons).*)',
  ],
}
