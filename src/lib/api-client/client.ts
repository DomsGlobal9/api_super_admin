export class ApiClient {
  private async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'x-timezone-offset': new Date().getTimezoneOffset().toString(),
    };

    const response = await fetch(`/api/admin/v1${url}`, {
      ...options,
      cache: 'no-store',
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'API request failed');
    }

    return result.data as T;
  }

  get<T>(url: string, params?: Record<string, string | number | boolean | undefined>) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this.fetch<T>(fullUrl, { method: 'GET' });
  }

  post<T>(url: string, body?: any) {
    return this.fetch<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(url: string, body: any) {
    return this.fetch<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(url: string) {
    return this.fetch<T>(url, { method: 'DELETE' });
  }
}

export const baseClient = new ApiClient();
