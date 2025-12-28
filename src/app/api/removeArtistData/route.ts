import { unauthorizedResponse } from '@/lib/apiErrors';

export async function POST() {
  return unauthorizedResponse();
} 