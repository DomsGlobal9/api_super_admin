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
  // Set by the gateway itself, from the authenticated API key. A caller's own value must never
  // reach a backend: downstream this names the tenant and the spend budget, so a customer could
  // otherwise claim to be another and spend their allowance. proxyRequest overwrites it too --
  // this is here so the protection does not depend on every future call path remembering to.
  sanitized.delete('x-gateway-client-id');

  return sanitized;
}
