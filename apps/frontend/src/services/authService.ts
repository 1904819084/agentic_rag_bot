import type { AuthLoginUrlResponse, AuthMeResponse } from '@rag/shared';
import { request } from './http';

export function getCurrentUser() {
  return request<AuthMeResponse>('/auth/me');
}

export function logout() {
  return request<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export async function getFeishuLoginUrl() {
  const response = await request<AuthLoginUrlResponse>('/auth/feishu/login-url');
  return response.loginUrl;
}
