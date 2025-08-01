// Simple API utility wrapping Fetch API to mimic Axios-like interface used in the project
// Provides get, post, put, delete methods that return a response object with a `data` field.
// Usage mirrors Axios so existing code (e.g., api.get(url).then(res => res.data)) continues to work.

const defaultHeaders = {
  'Accept': 'application/json',
};

const BASE_URL = import.meta.env.VITE_API_URL || '';

function isPlainObject(obj) {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Headers);
}

async function request(url, options = {}) {
  let mergedHeaders = { ...defaultHeaders };
  if (isPlainObject(options.headers)) {
    mergedHeaders = { ...mergedHeaders, ...options.headers };
  }
  // Only set Content-Type if body is not FormData
  if (options.body && typeof options.body === 'object' && options.body instanceof FormData) {
    delete mergedHeaders['Content-Type'];
  } else {
    mergedHeaders['Content-Type'] = 'application/json';
  }
  const response = await fetch(BASE_URL + url, {
    ...options,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    // Try to parse error body; fallback to status text
    let errorMessage;
    try {
      const err = await response.json();
      errorMessage = err?.message || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  // Attempt to parse JSON; if empty response, return null
  const data = (await response.text()).trim();
  return { data: data ? (JSON.parse(data)) : (null) };
}

export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) =>
    request(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (url, body) =>
    request(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: (url) => request(url, { method: 'DELETE' }),
};
