import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isLookOnly, LOOK_ONLY_MESSAGE } from '@/lib/demo';

/**
 * Refreshes the Supabase session cookie on every request so Server Components and
 * Route Handlers always see a valid login (standard @supabase/ssr pattern).
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('127.0.0.1')) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Local recording mode: no sign-in page, the staff pages open as LOCAL_DEMO_USER (lib/db/auth.ts).
  if (process.env.LOCAL_DEMO_USER && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' && request.nextUrl.pathname === '/login') {
    const next = request.nextUrl.searchParams.get('next');
    return NextResponse.redirect(new URL(next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin', request.url));
  }

  // Do not remove: getUser() triggers the token refresh.
  const { data: { user } } = await supabase.auth.getUser();

  // Public demo: demo accounts may look around the staff workspace but not change anything.
  if (isLookOnly(user?.email) && isStaffWrite(request)) {
    return NextResponse.json({ error: LOOK_ONLY_MESSAGE }, { status: 403 });
  }
  return response;
}

/** Staff API calls that change data. The public ones (asking Dhruv, submitting a quiz) stay open. */
function isStaffWrite(request: NextRequest): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return false;
  const path = request.nextUrl.pathname;
  return path.startsWith('/api/') && path !== '/api/chat' && !path.startsWith('/api/education/quiz/');
}

export const config = {
  // Skip static files and images.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
