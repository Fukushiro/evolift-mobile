import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Credentials = {
  username: string;
  password: string;
};

export type AuthUser = {
  username: string;
  appUserId: number | null;
  role: string | null;
};

export type AuthSession = {
  credentials: Credentials;
  user: AuthUser;
};

type AuthState = {
  session: AuthSession | null;
  isRestoring: boolean;
};

const initialState: AuthState = {
  session: null,
  isRestoring: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    restoreSession(state, action: PayloadAction<AuthSession | null>) {
      state.session = action.payload;
      state.isRestoring = false;
    },
    setSession(state, action: PayloadAction<AuthSession>) {
      state.session = action.payload;
    },
    clearSession(state) {
      state.session = null;
    },
  },
});

export const { clearSession, restoreSession, setSession } = authSlice.actions;
export default authSlice.reducer;
