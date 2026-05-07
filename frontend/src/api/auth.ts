import apiClient from './client';
import type { LoginRequest, TokenResponse, User } from '@/types';

export const authApi = {
    login: async (credentials: LoginRequest): Promise<TokenResponse> => {
        const response = await apiClient.post<TokenResponse>('/api/auth/login', credentials);
        return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await apiClient.get<User>('/api/auth/me');
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },
};
