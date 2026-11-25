import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fitnex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = error.response?.data?.message;

    if (!message && error.code === 'ECONNABORTED') {
      message = 'The server took too long to respond. Please try again.';
    }

    if (!message && !error.response) {
      message = 'Unable to reach the FITNEX server. Please check that the backend is running.';
    }

    message ||= 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
