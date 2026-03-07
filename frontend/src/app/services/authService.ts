import apiClient from './apiClient';

export interface SignupData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  access_role: string;
  created_at: string;
}

export async function signup(data: SignupData) {
  const response = await apiClient.post('/auth/signup', data);
  return response.data;
}

export async function login(data: LoginData): Promise<{ token: string }> {
  const response = await apiClient.post('/auth/login', data);
  const { token } = response.data;
  localStorage.setItem('token', token);
  return response.data;
}

export function logout() {
  localStorage.removeItem('token');
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

<<<<<<< HEAD

=======
>>>>>>> c65fc01c1900cb6ff87231d97a96e24bd218a9e8
function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  return atob(base64);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
    // Check if token is expired
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get('/users/me');
  return response.data;
}

export async function updateProfile(username: string) {
  const response = await apiClient.patch('/users/me', { username });
  return response.data;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const response = await apiClient.get('/users/all');
  return response.data;
}

export async function updateUserRole(email: string, role: string): Promise<UserProfile> {
  const response = await apiClient.patch(`/users/${encodeURIComponent(email)}/role`, { role });
  return response.data;
}
