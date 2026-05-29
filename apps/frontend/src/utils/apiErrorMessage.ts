import { isAxiosError } from 'axios';

type ApiErrorBody = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const data = err.response.data as ApiErrorBody;
    const details = data.fieldErrors
      ? Object.entries(data.fieldErrors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(' · ')
      : '';
    if (data.message && details) return `${data.message} (${details})`;
    if (data.message) return data.message;
    if (details) return details;
  }
  return fallback;
}
