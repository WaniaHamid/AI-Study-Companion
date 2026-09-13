import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.patch('/auth/profile', data),
};

// --- Documents ---
export const documentsAPI = {
  upload: (formData: FormData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params?: any) => api.get('/documents/user', { params }),
  getById: (id: string) => api.get(`/documents/${id}`),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// --- AI ---
export const aiAPI = {
  ask: (data: { documentId: string; question: string }) => api.post('/ai/ask', data),
  summarize: (documentId: string) => api.post('/ai/summarize', { documentId }),
  getHistory: (params?: any) => api.get('/ai/history', { params }),
};

// --- Quiz ---
export const quizAPI = {
  generate: (data: { documentId: string; questionCount?: number; difficulty?: string }) =>
    api.post('/quiz/generate', data),
  submit: (quizId: string, data: { answers: number[]; timeTaken?: number }) =>
    api.post(`/quiz/${quizId}/submit`, data),
  getHistory: (params?: any) => api.get('/quiz/history', { params }),
  getById: (id: string) => api.get(`/quiz/${id}`),
};

// --- Analytics ---
export const analyticsAPI = {
  getUserAnalytics: () => api.get('/analytics/user'),
};

export default api;
