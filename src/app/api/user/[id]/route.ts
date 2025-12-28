import { unauthorizedResponse } from '@/lib/apiErrors';

export async function GET() {
  return unauthorizedResponse();
}
