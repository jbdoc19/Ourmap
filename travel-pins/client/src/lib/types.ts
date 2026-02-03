// Type definitions for the client

export interface Pin {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePinInput {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  emoji: string;
}

export interface UpdatePinInput {
  title?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  emoji?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}
