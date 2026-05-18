import { io } from 'socket.io-client';
import { create } from 'zustand';

export const useRealtimeStore = create((set) => ({
  status: 'disconnected',
  lastEventTime: null,
  setStatus: (status) => set({ status }),
  setLastEventTime: (time) => set({ lastEventTime: time }),
}));

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('[Socket.IO] Connected');
    useRealtimeStore.getState().setStatus('connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Disconnected:', reason);
    useRealtimeStore.getState().setStatus('disconnected');
  });

  socket.on('reconnecting', () => {
    useRealtimeStore.getState().setStatus('reconnecting');
  });

  socket.on('reconnect_attempt', () => {
    useRealtimeStore.getState().setStatus('reconnecting');
  });

  socket.on('reconnect', () => {
    useRealtimeStore.getState().setStatus('connected');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    useRealtimeStore.getState().setStatus('disconnected');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export default { connectSocket, disconnectSocket, getSocket };
