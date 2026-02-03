// API client utilities

import type { Pin, CreatePinInput, UpdatePinInput, ApiResponse } from './types';

const API_BASE_URL = '/api';

export async function fetchPins(): Promise<Pin[]> {
  const response = await fetch(`${API_BASE_URL}/pins`);
  if (!response.ok) {
    throw new Error('Failed to fetch pins');
  }
  const data: ApiResponse<Pin[]> = await response.json();
  return data.data || [];
}

export async function createPin(input: CreatePinInput): Promise<Pin> {
  const response = await fetch(`${API_BASE_URL}/pins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error('Failed to create pin');
  }
  const data: ApiResponse<Pin> = await response.json();
  if (!data.data) {
    throw new Error('No data returned from create pin');
  }
  return data.data;
}

export async function updatePin(id: string, input: UpdatePinInput): Promise<Pin> {
  const response = await fetch(`${API_BASE_URL}/pins/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error('Failed to update pin');
  }
  const data: ApiResponse<Pin> = await response.json();
  if (!data.data) {
    throw new Error('No data returned from update pin');
  }
  return data.data;
}

export async function deletePin(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/pins/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete pin');
  }
}
