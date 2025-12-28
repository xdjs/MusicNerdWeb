import { NextResponse } from 'next/server';

export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Permission denied') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}
