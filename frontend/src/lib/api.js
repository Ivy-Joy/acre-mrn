/*import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000
});

export default api;*/
import axios from 'axios';
import mockGrants from '../mocks/grants.json';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 4000
});

const api = {
  get: async (url) => {
    try {
      // Try real backend first
      const response = await axiosInstance.get(url);
      return response;
    } catch (error) {
      console.error(error);
      console.warn('API unavailable. Falling back to mock data.');

      // Fallback logic
      if (url === '/grants') {
        return { data: mockGrants };
      }

      return { data: [] };
    }
  },

  post: async (url, body) => {
    try {
      // Try real backend first
      const response = await axiosInstance.post(url, body);
      return response;
    } catch (error) {
      console.warn('API unavailable. Using mock mode for POST.');

      if (url === '/grants') {
        const newGrant = {
          _id: Date.now().toString(),
          ...body,
          startDate: new Date().toISOString()
        };

        return {
          data: {
            grant: newGrant
          }
        };
      }

      throw error;
    }
  }
};

export default api;

