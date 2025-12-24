import { unauthorizedResponse } from '@/lib/apiErrors';

export async function PUT() {
  return unauthorizedResponse();
} 