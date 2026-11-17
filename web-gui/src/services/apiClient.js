import { normalizeModel } from '../utils/serializer.js';

const DEFAULT_API_BASE = 'http://localhost:8080/api';

/**
 * Pure REST API client for communicating with the C++ server binary.
 * Uses standard HTTP requests (no WebSockets, no SSE).
 */
export async function submitSimulationRun(
  model,
  apiBaseUrl = DEFAULT_API_BASE
) {
  const payload = normalizeModel(model);
  const endpoint = `${apiBaseUrl.replace(/\/+$/, '')}/simulate`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Server responded with HTTP ${response.status}${errText ? `: ${errText}` : ''}`
    );
  }

  return response.json();
}

export async function checkServerHealth(apiBaseUrl = DEFAULT_API_BASE) {
  const endpoint = `${apiBaseUrl.replace(/\/+$/, '')}/health`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json().catch(() => ({ status: 'ok' }));
}
