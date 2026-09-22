import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || 'Request failed');
    }

    return (await response.json()) as T;
  }

  async post<TResponse, TBody = unknown>(path: string, body: TBody): Promise<TResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || 'Request failed');
    }

    return (await response.json()) as TResponse;
  }
}
