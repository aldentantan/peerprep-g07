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
  profile_image_url: string;
}

export interface UserProfileUpdateData {
  username?: string;
  profile_image?: File;
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

export async function updateProfile(userData: Partial<UserProfileUpdateData>) {
  const formData = new FormData();
  if (userData.username !== undefined) formData.append('username', userData.username);
  if (userData.profile_image !== undefined) formData.append('profile_image', userData.profile_image);
  const response = await apiClient.patch('/users/me', formData);
  const { token } = response.data;
  localStorage.setItem('token', token); // Update token with new username info
  return response.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await apiClient.patch('/users/me/password', { current_password: currentPassword, new_password: newPassword });
  return response.data;
}

export async function deleteAccount() {
  const response = await apiClient.delete('/users/me');
  logout();
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
