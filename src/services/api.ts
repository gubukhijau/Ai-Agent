import { AdminConfig, DispatchLogEntry, OrderPayload } from '../types';

const TOKEN_KEY = 'ipl_admin_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function notifyAuthExpired() {
  removeStoredToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ipl_auth_expired'));
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }
  return headers;
}

export async function loginAdmin(password: string): Promise<{ success: boolean; token?: string; message?: string }> {
  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setStoredToken(data.token);
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal terhubung ke server backend.',
    };
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fetch('/api/admin/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (e) {
    // ignore
  } finally {
    removeStoredToken();
  }
}

export async function checkAdminAuth(): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/admin/auth/me', {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      notifyAuthExpired();
      return false;
    }
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchAdminConfig(): Promise<AdminConfig | null> {
  try {
    const res = await fetch('/api/admin/config', {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      notifyAuthExpired();
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveAdminConfig(config: Partial<{
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
  whatsappAdminNumber: string;
  whatsappApiVersion: string;
  whatsappTemplateName: string;
  elevenlabsWebhookSecret: string;
  adminPassword?: string;
}>): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    if (res.status === 401) {
      notifyAuthExpired();
      throw new Error('Sesi admin berakhir. Silakan login kembali.');
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Gagal menyimpan konfigurasi');
    }
    return data;
  } catch (err: any) {
    throw new Error(err?.message || 'Gagal menyimpan konfigurasi');
  }
}

export async function sendTestNotification(order: OrderPayload): Promise<{
  success: boolean;
  message: string;
  whatsapp_message_id?: string;
  meta_response?: any;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/test-notification', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(order),
    });
    if (res.status === 401) {
      notifyAuthExpired();
      return {
        success: false,
        message: 'Sesi admin berakhir. Silakan login kembali.',
      };
    }
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.message || 'Gagal mengirim notifikasi tes.',
        error: data.error,
        meta_response: data.meta_response,
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal menghubungi server.',
    };
  }
}

export async function simulateWebhookCall(
  order: OrderPayload,
  token: string
): Promise<{
  status: number;
  data: any;
}> {
  try {
    const res = await fetch('/api/webhooks/elevenlabs/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    return { status: res.status, data };
  } catch (err: any) {
    return {
      status: 500,
      data: { error: 'NETWORK_ERROR', message: err?.message || 'Gagal menghubungi webhook.' },
    };
  }
}

export async function fetchDispatchEvents(): Promise<DispatchLogEntry[]> {
  const token = getStoredToken();
  if (!token) return [];

  try {
    const res = await fetch('/api/admin/events', {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      notifyAuthExpired();
      return [];
    }
    if (!res.ok) return [];
    const json = await res.json();
    return json.events || [];
  } catch (err) {
    // Graceful fallback without throwing unhandled rejection
    return [];
  }
}

export async function clearDispatchEvents(): Promise<void> {
  try {
    const res = await fetch('/api/admin/events', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      notifyAuthExpired();
    }
  } catch (e) {
    // ignore
  }
}
