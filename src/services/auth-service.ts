import { ApiError, apiRequest, basicAuthorization } from './api';
import type { AuthSession, AuthUser, Credentials } from '@/store/auth-slice';

export type Workout = {
  id?: number | string;
  nome: string;
  quantidadeSeries?: number;
  quantidadeExecucoes?: number;
  exercicios?: WorkoutExercise[];
};

export type WorkoutExercise = {
  exercicioId?: number | string;
  exercicio?: {
    id?: number | string;
    nome?: string;
    videoUrl?: string | null;
  };
  nome?: string;
  videoUrl?: string | null;
  posicao?: number;
  quantidadeSeries?: number;
  quantidadeExecucoes?: number;
};

export type Exercise = {
  id: number | string;
  nome: string;
  videoUrl?: string | null;
};

export type NewWorkout = {
  nome: string;
  appUserId: number;
  exercicios: {
    exercicioId: number;
    posicao: number;
    quantidadeSeries: number;
    quantidadeExecucoes: number;
  }[];
};

export async function getWorkout(
  session: AuthSession,
  workoutId: string,
): Promise<Workout> {
  const payload = await apiRequest<unknown>(
    `/treinos/${encodeURIComponent(workoutId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: basicAuthorization(
          session.credentials.username,
          session.credentials.password,
        ),
      },
    },
  );

  const workout =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>).data ??
        (payload as Record<string, unknown>).treino ??
        payload
      : payload;
  if (!isWorkout(workout)) {
    throw new ApiError('O servidor retornou um treino em formato inválido.', 502);
  }
  return { ...workout, id: workout.id ?? workoutId };
}

export async function login(credentials: Credentials): Promise<AuthSession> {
  const payload = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  return {
    credentials,
    user: {
      username: credentials.username,
      appUserId: findUserId(payload),
      role: findUserRole(payload),
    },
  };
}

export async function register(credentials: Credentials): Promise<void> {
  await apiRequest<unknown>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
}

export async function listWorkouts(session: AuthSession): Promise<Workout[]> {
  const payload = await apiRequest<unknown>('/treinos', {
    method: 'GET',
    headers: {
      Authorization: basicAuthorization(
        session.credentials.username,
        session.credentials.password,
      ),
    },
  });

  const records = Array.isArray(payload)
    ? payload
    : typeof payload === 'object' && payload !== null
      ? ['data', 'content', 'treinos']
          .map((key) => (payload as Record<string, unknown>)[key])
          .find(Array.isArray) ?? []
      : [];

  return records.filter(isWorkout);
}

export async function listExercises(session: AuthSession): Promise<Exercise[]> {
  const payload = await apiRequest<unknown>('/exercicios', {
    method: 'GET',
    headers: { Authorization: authorizationFor(session) },
  });
  return getRecords(payload, ['data', 'content', 'exercicios']).filter(isExercise);
}

export async function createWorkout(
  session: AuthSession,
  workout: NewWorkout,
): Promise<unknown> {
  return apiRequest('/treinos', {
    method: 'POST',
    headers: {
      Authorization: authorizationFor(session),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workout),
  });
}

export async function updateWorkout(
  session: AuthSession,
  workoutId: string,
  workout: NewWorkout,
): Promise<unknown> {
  return apiRequest(`/treinos/${encodeURIComponent(workoutId)}`, {
    method: 'PUT',
    headers: {
      Authorization: authorizationFor(session),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workout),
  });
}

export async function createExercise(
  session: AuthSession,
  name: string,
  videoUrl?: string,
): Promise<Exercise> {
  const payload = await apiRequest<unknown>('/exercicios', {
    method: 'POST',
    headers: {
      Authorization: authorizationFor(session),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nome: name,
      ...(videoUrl ? { videoUrl } : {}),
    }),
  });
  const record = isRecord(payload) ? payload : null;
  const exercise = record?.data ?? record?.exercicio ?? payload;
  if (!isExercise(exercise)) {
    throw new ApiError('O servidor retornou um exercício em formato inválido.', 502);
  }
  return exercise;
}

export async function updateExercise(
  session: AuthSession,
  exerciseId: string,
  name: string,
  videoUrl?: string | null,
): Promise<unknown> {
  return apiRequest(`/exercicios/${encodeURIComponent(exerciseId)}`, {
    method: 'PUT',
    headers: {
      Authorization: authorizationFor(session),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nome: name,
      ...(videoUrl !== undefined ? { videoUrl } : {}),
    }),
  });
}

export async function deleteExercise(
  session: AuthSession,
  exerciseId: string,
): Promise<void> {
  await apiRequest(`/exercicios/${encodeURIComponent(exerciseId)}`, {
    method: 'DELETE',
    headers: { Authorization: authorizationFor(session) },
  });
}

function authorizationFor(session: AuthSession): string {
  return basicAuthorization(session.credentials.username, session.credentials.password);
}

function getRecords(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (isRecord(payload)) {
    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWorkout(value: unknown): value is Workout {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nome' in value &&
    typeof value.nome === 'string'
  );
}

function isExercise(value: unknown): value is Exercise {
  return (
    isRecord(value) &&
    (typeof value.id === 'number' || typeof value.id === 'string') &&
    String(value.id).length > 0 &&
    typeof value.nome === 'string' &&
    (value.videoUrl === undefined || value.videoUrl === null || typeof value.videoUrl === 'string')
  );
}

function findUserId(payload: unknown): number | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  for (const key of ['appUserId', 'userId', 'id']) {
    const value = record[key];
    const id =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : null;
    if (id !== null && Number.isSafeInteger(id) && id > 0) {
      return id;
    }
  }
  for (const key of ['data', 'user', 'usuario', 'appUser']) {
    const id = findUserId(record[key]);
    if (id !== null) {
      return id;
    }
  }
  return null;
}

function findUserRole(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.role === 'string' && record.role.trim()) {
    return record.role.trim().toUpperCase();
  }
  for (const key of ['data', 'user', 'usuario', 'appUser']) {
    const role = findUserRole(record[key]);
    if (role !== null) {
      return role;
    }
  }
  return null;
}

export function isStoredSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const session = value as Partial<AuthSession>;
  const credentials = session.credentials as Partial<Credentials> | undefined;
  const user = session.user as Partial<AuthUser> | undefined;
  return (
    typeof credentials?.username === 'string' &&
    typeof credentials.password === 'string' &&
    typeof user?.username === 'string' &&
    (typeof user.appUserId === 'number' || user.appUserId === null) &&
    (typeof user.role === 'string' || user.role === null)
  );
}
