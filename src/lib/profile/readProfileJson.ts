import { requestUserApi } from '@/lib/user/requestUserApi';

export async function readProfileJson<T>(url: string, userId: string, signal?: AbortSignal): Promise<T> {
  const response = await requestUserApi(url, { headers: {'X-Profile-Account': userId}, signal });
  if (!response.ok) throw new Error('Could not load this part of your profile. Please retry.');
  const data = await response.json();
  if (data.userId !== userId) throw new Error('Your account changed. Refresh and try again.');
  return data;
}
