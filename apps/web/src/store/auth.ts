import { create } from 'zustand'
import { setAccessToken, clearAccessToken } from '@/lib/api'
import type { Role } from '@lms/types'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
  branchId: string
  branchName: string
}

type AuthState = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // true on mount — we check cookie refresh

  setAuth: (user, accessToken) => {
    setAccessToken(accessToken)
    set({ user, isAuthenticated: true, isLoading: false })
  },

  clearAuth: () => {
    clearAccessToken()
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (loading) => set({ isLoading: loading }),
}))