import axios from 'axios';

// Base API configuration (Vite proxies /api to Flask backend)
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Authentication APIs
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  getDemoUsers: () => api.get('/auth/demo-users')
};

// Report APIs
export const reportApi = {
  submitReport: (reportData) => api.post('/reports', reportData),
  getReports: (params) => api.get('/reports', { params }),
  getReportDetail: (reportId) => api.get(`/reports/${reportId}`),
  updateReportStatus: (reportId, status, notes) => api.patch(`/reports/${reportId}/status`, { status, notes })
};

// Validation APIs
export const validationApi = {
  validateDfa: (patientId) => api.post('/validation/dfa', { patient_id: patientId }),
  validateRegex: (patientId) => api.post('/validation/regex', { patient_id: patientId }),
  compareValidation: (patientId) => api.post('/validation/compare', { patient_id: patientId }),
  getSupportedReportTypes: () => api.get('/validation/report-types')
};

// Handler APIs
export const handlerApi = {
  getHandlers: (params) => api.get('/handlers', { params }),
  getHandlerDetail: (handlerId) => api.get(`/handlers/${handlerId}`),
  updateHandler: (handlerId, data) => api.patch(`/handlers/${handlerId}`, data)
};

// Routing APIs
export const routingApi = {
  getRoutingRules: () => api.get('/routing'),
  updateRoutingRule: (ruleId, data) => api.patch(`/routing/${ruleId}`, data),
  getZones: () => api.get('/routing/zones'),
  getDispatchEvents: (limit = 50) => api.get(`/routing/events?limit=${limit}`)
};

// Queue APIs
export const queueApi = {
  getQueues: (params) => api.get('/queues', { params }),
  processQueues: (zoneId) => api.post('/queues/process', { zone_id: zoneId })
};

// Simulation APIs
export const simulationApi = {
  getScenarios: () => api.get('/simulations/scenarios'),
  runSimulation: (simulationPayload) => api.post('/simulations/run', simulationPayload)
};

// Analytics APIs
export const analyticsApi = {
  getOverview: () => api.get('/analytics/overview'),
  getCategories: () => api.get('/analytics/categories'),
  getZones: () => api.get('/analytics/zones'),
  getPerformance: () => api.get('/analytics/performance')
};

export default api;
