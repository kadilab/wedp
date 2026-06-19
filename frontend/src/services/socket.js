import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }

  connect() {
    if (this.socket?.connected) return

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinUser(userId) {
    if (this.socket) {
      this.socket.emit('join-user', userId)
    }
  }

  joinWedding(weddingId) {
    if (this.socket) {
      this.socket.emit('join-wedding', weddingId)
    }
  }

  leaveWedding(weddingId) {
    if (this.socket) {
      this.socket.emit('leave-wedding', weddingId)
    }
  }

  onCheckIn(callback) {
    if (this.socket) {
      this.socket.on('guest-checked-in', callback)
      this.listeners.set('guest-checked-in', callback)
    }
  }

  onRSVP(callback) {
    if (this.socket) {
      this.socket.on('rsvp-updated', callback)
      this.listeners.set('rsvp-updated', callback)
    }
  }

  onGuestUpdate(callback) {
    if (this.socket) {
      this.socket.on('guest-updated', callback)
      this.listeners.set('guest-updated', callback)
    }
  }

  onNotification(callback) {
    if (this.socket) {
      this.socket.on('notification', callback)
      this.listeners.set('notification', callback)
    }
  }

  offCheckIn() {
    if (this.socket && this.listeners.has('guest-checked-in')) {
      this.socket.off('guest-checked-in', this.listeners.get('guest-checked-in'))
      this.listeners.delete('guest-checked-in')
    }
  }

  offRSVP() {
    if (this.socket && this.listeners.has('rsvp-updated')) {
      this.socket.off('rsvp-updated', this.listeners.get('rsvp-updated'))
      this.listeners.delete('rsvp-updated')
    }
  }

  removeAllListeners() {
    this.listeners.forEach((callback, event) => {
      if (this.socket) {
        this.socket.off(event, callback)
      }
    })
    this.listeners.clear()
  }
}

export const socketService = new SocketService()
export default socketService
