import { isAxiosError } from 'axios';

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const message = (err.response.data as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}
