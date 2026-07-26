/**
 * Socket.IO client singleton for RansomShield real-time events.
 *
 * - initSocket(token): creates (or recreates) a socket with JWT auth handshake.
 *   Called on login and whenever the access token is refreshed mid-session.
 * - disconnectSocket(): tears down the connection on logout.
 * - getSocket(): returns the current socket instance (or null if not connected).
 *
 * Event names emitted by the server:
 *   detection:new       – a new detection was created
 *   detection:resolved  – a detection status changed
 *   cti:published       – a CTI report was published to the blockchain
 */

import { io, type Socket } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL as string

let _socket: Socket | null = null

export function initSocket(accessToken: string): Socket {
  // If already connected with same token, no-op
  if (_socket?.connected) {
    // Reconnect with fresh token (token refreshed mid-session)
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
