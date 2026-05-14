const isDev = import.meta.env.DEV;

const getApiBase = () => {
  if (isDev) {
    return 'http://localhost:8002';
  }
  return window.location.origin.replace(/:\d+$/, ':8002');
};

export const API_BASE_URL = getApiBase();

console.log('API Base URL:', API_BASE_URL);
