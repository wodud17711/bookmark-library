import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})
