const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://evolift-back.onrender.com/').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Confira sua conexão.', 0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload) ?? 'Não foi possível concluir a solicitação. Tente novamente.',
      response.status,
    );
  }
  return payload as T;
}

function getErrorMessage(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  for (const key of ['message', 'detail', 'title']) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

export function basicAuthorization(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    encoded += second === undefined
      ? '=='
      : third === undefined
        ? `${alphabet[(second & 15) << 2]}=`
        : `${alphabet[((second & 15) << 2) | (third >> 6)]}${alphabet[third & 63]}`;
  }

  return `Basic ${encoded}`;
}
