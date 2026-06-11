import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const httpClient = axios.create({
  baseURL: '/api',
  timeout: 60_000,
  withCredentials: true,
});

export async function request<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  try {
    const response = await httpClient.request<T>({
      url,
      ...config,
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message =
        typeof error.response?.data === 'object' &&
        error.response.data &&
        'message' in error.response.data
          ? String((error.response.data as { message?: unknown }).message)
          : error.message;
      const requestError = new Error(status ? `Request failed: ${status} ${message}` : message);
      Object.assign(requestError, { cause: error });
      throw requestError;
    }

    if (error instanceof Error) {
      throw error;
    }

    const requestError = new Error('Request failed');
    Object.assign(requestError, { cause: error });
    throw requestError;
  }
}
