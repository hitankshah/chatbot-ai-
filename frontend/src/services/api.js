// frontend/src/services/api.js
// API service for communicating with the backend

const API_BASE = '/api';

/**
 * Helper to make authenticated API requests
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, config);
  } catch (err) {
    throw new Error('Cannot connect to server. Is the backend running?');
  }

  // Handle empty or non-JSON responses
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned invalid response (${response.status})`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  signup: (email, password, fullName) =>
    apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    }),

  login: (email, password, twoFactorCode) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, twoFactorCode }),
    }),

  getProfile: () => apiRequest('/auth/me'),

  setupTwoFactor: () =>
    apiRequest('/auth/2fa/setup', {
      method: 'POST',
    }),

  verifyTwoFactor: (code) =>
    apiRequest('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  updateProfile: (data) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================
// CHATBOTS API
// ============================================
export const chatbotsAPI = {
  list: () => apiRequest('/chatbots'),

  get: (id) => apiRequest(`/chatbots/${id}`),

  create: (data) =>
    apiRequest('/chatbots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiRequest(`/chatbots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiRequest(`/chatbots/${id}`, { method: 'DELETE' }),

  getConversations: (id, page = 1) =>
    apiRequest(`/chatbots/${id}/conversations?page=${page}`),
};

// ============================================
// SCRAPE API
// ============================================
export const scrapeAPI = {
  start: (chatbotId, url) =>
    apiRequest('/scrape', {
      method: 'POST',
      body: JSON.stringify({ chatbotId, url }),
    }),

  trainRawText: (chatbotId, text, title) =>
    apiRequest('/scrape/raw-text', {
      method: 'POST',
      body: JSON.stringify({ chatbotId, text, title }),
    }),

  trainSitemap: (chatbotId, sitemapUrl, maxPages = 30) =>
    apiRequest('/scrape/sitemap', {
      method: 'POST',
      body: JSON.stringify({ chatbotId, sitemapUrl, maxPages }),
    }),

  trainUpload: (chatbotId, fileName, mimeType, base64Data) =>
    apiRequest('/scrape/upload', {
      method: 'POST',
      body: JSON.stringify({ chatbotId, fileName, mimeType, base64Data }),
    }),

  status: (contentId) => apiRequest(`/scrape/status/${contentId}`),
};

export const integrationsAPI = {
  getSettings: (chatbotId) => apiRequest(`/integrations/${chatbotId}`),

  updateWebhook: (chatbotId, payload) =>
    apiRequest(`/integrations/${chatbotId}/webhook`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  testHandoff: (chatbotId, reason, context = {}) =>
    apiRequest(`/integrations/${chatbotId}/test-handoff`, {
      method: 'POST',
      body: JSON.stringify({ reason, context }),
    }),

  listLeads: (chatbotId, page = 1, limit = 20) =>
    apiRequest(`/integrations/${chatbotId}/leads?page=${page}&limit=${limit}`),

  listHandoffs: (chatbotId, status = '') =>
    apiRequest(`/integrations/${chatbotId}/handoffs${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  updateHandoff: (chatbotId, handoffId, payload) =>
    apiRequest(`/integrations/${chatbotId}/handoffs/${handoffId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  dailySummary: (chatbotId, date) =>
    apiRequest(`/integrations/${chatbotId}/daily-summary${date ? `?date=${encodeURIComponent(date)}` : ''}`),

  exportLeadsUrl: (chatbotId) => `${API_BASE}/integrations/${chatbotId}/leads/export.csv`,
};

// ============================================
// BILLING API
// ============================================
export const billingAPI = {
  plans: () => apiRequest('/billing/plans'),
  subscription: () => apiRequest('/billing/subscription'),
  subscribe: (planCode, returnUrl, cancelUrl) =>
    apiRequest('/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planCode, returnUrl, cancelUrl }),
    }),
  cancel: (subscriptionId) =>
    apiRequest('/billing/cancel', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    }),
};

// ============================================
// WORKSPACES API
// ============================================
export const workspacesAPI = {
  current: () => apiRequest('/workspaces/current'),
  invite: (email, role) =>
    apiRequest('/workspaces/invites', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  acceptInvite: (token) =>
    apiRequest('/workspaces/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  updateMemberRole: (memberId, role) =>
    apiRequest(`/workspaces/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  revokeInvite: (inviteId) =>
    apiRequest(`/workspaces/invites/${inviteId}`, { method: 'DELETE' }),
  updateSecurity: (payload) =>
    apiRequest('/workspaces/security', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

// ============================================
// ANALYTICS API
// ============================================
export const analyticsAPI = {
  summary: (chatbotId, from, to) =>
    apiRequest(`/analytics/summary?chatbotId=${encodeURIComponent(chatbotId)}${from ? `&from=${encodeURIComponent(from)}` : ''}${to ? `&to=${encodeURIComponent(to)}` : ''}`),
  conversations: (chatbotId, page = 1, limit = 20) =>
    apiRequest(`/analytics/conversations?chatbotId=${encodeURIComponent(chatbotId)}&page=${page}&limit=${limit}`),
  conversationDetail: (conversationId) =>
    apiRequest(`/analytics/conversations/${conversationId}`),
  feedback: (conversationId, rating, notes) =>
    apiRequest(`/analytics/conversations/${conversationId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, notes }),
    }),
};

// ============================================
// API KEYS
// ============================================
export const apiKeysAPI = {
  list: () => apiRequest('/keys'),
  create: (name) =>
    apiRequest('/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  revoke: (keyId) => apiRequest(`/keys/${keyId}`, { method: 'DELETE' }),
};

// ============================================
// AUDIT LOGS
// ============================================
export const auditAPI = {
  list: (page = 1, limit = 50) => apiRequest(`/audit?page=${page}&limit=${limit}`),
  exportUrl: () => `${API_BASE}/audit/export.csv`,
};

// ============================================
// AUTO-SYNC OPS
// ============================================
export const autoSyncAPI = {
  sources: (chatbotId) => apiRequest(`/training-sources?chatbotId=${encodeURIComponent(chatbotId)}`),
  updateSource: (sourceId, payload) =>
    apiRequest(`/training-sources/${sourceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  sourceLogs: (sourceId) => apiRequest(`/training-sources/${sourceId}/logs`),
  jobs: () => apiRequest('/system/auto-sync/jobs'),
  retryJob: (jobId) => apiRequest(`/system/auto-sync/jobs/${jobId}/retry`, { method: 'POST' }),
};
