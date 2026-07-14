export function sanitizeHeaders(incomingHeaders: Headers): Headers {
  const sanitized = new Headers(incomingHeaders);

  // Strip sensitive/internal headers before proxying
  sanitized.delete('x-api-key');
  sanitized.delete('authorization'); // if gateway handled auth, strip it
  sanitized.delete('cookie');
  sanitized.delete('set-cookie');
  sanitized.delete('host');
  sanitized.delete('connection');
  sanitized.delete('content-length');

  return sanitized;
}
