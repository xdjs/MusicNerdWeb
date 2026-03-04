import { NextRequest, NextResponse } from 'next/server';

const STRICT_PATHS = ['/api/funFacts', '/api/artistBio'];
const MEDIUM_PATHS = ['/api/validateLink'];

type Tier = 'strict' | 'medium' | 'default';

function getTier(pathname: string): Tier {
  if (STRICT_PATHS.some((p) => pathname.startsWith(p))) return 'strict';
  if (MEDIUM_PATHS.some((p) => pathname.startsWith(p))) return 'medium';
  return 'default';
}

function getLimit(tier: Tier): number {
  switch (tier) {
    case 'strict':
      return Number(process.env.RATE_LIMIT_STRICT) || 5;
    case 'medium':
      return Number(process.env.RATE_LIMIT_MEDIUM) || 20;
    default:
      return Number(process.env.RATE_LIMIT_DEFAULT) || 60;
  }
}

function getWindowMs(): number {
  return Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export const _rateLimitMap = new Map<string, RateLimitEntry>();
let requestCount = 0;

function cleanup(now: number) {
  for (const [key, entry] of _rateLimitMap) {
    if (now >= entry.resetTime) {
      _rateLimitMap.delete(key);
    }
  }
}

export function middleware(request: NextRequest): NextResponse {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const pathname = request.nextUrl.pathname;
  const now = Date.now();
  const windowMs = getWindowMs();
  const tier = getTier(pathname);
  const limit = getLimit(tier);
  const key = `${ip}:${tier}`;

  // Periodic cleanup every 100 requests
  requestCount++;
  if (requestCount % 100 === 0) {
    cleanup(now);
  }

  const entry = _rateLimitMap.get(key);

  if (!entry || now >= entry.resetTime) {
    _rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return NextResponse.next();
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/((?!auth).*)',
};
