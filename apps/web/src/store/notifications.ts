import { create } from 'zustand'

export type Notification = {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  leadId?: string
  createdAt: Date
  isRead: boolean
}

type NotificationState = {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void
  markAllRead: () => void
  markRead: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      isRead: false,
    }
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }))
  },

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
}))