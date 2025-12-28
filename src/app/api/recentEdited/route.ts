import { unauthorizedResponse } from '@/lib/apiErrors';

export const dynamic = "force-dynamic";

export async function GET() {
  return unauthorizedResponse();
} 