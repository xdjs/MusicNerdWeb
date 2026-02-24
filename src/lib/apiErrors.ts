import { NextResponse } from 'next/server';

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Authentication temporarily disabled' },
    { status: 401 }
  );
}
