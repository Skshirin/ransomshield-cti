import { io, type Socket } from 'socket.io-client'

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL as string) || ''

let _socket: Socket | null = null

export function initSocket(accessToken: string): Socket {
  if (_socket?.connected) {
    _socket.disconnect()
  }

  _socket = io(WS_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  _socket.on('connect', () => {
    console.log('[socket] Connected, id:', _socket?.id)
  })

  _socket.on('connect_error', (err) => {
    console.warn('[socket] Connection error:', err.message)
  })

  _socket.on('disconnect', (reason) => {
    console.log('[socket] Disconnected:', reason)
  })

  return _socket
}

export function getSocket(): Socket | null {
  return _socket
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect()
    _socket = null
  }
}
