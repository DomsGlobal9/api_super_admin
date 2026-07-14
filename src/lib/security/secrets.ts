/**
 * Safely masks sensitive keys in headers or query parameters before logging.
 */
export function maskSecrets(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sensitiveKeys = ['authorization', 'x-api-key', 'cookie', 'set-cookie', 'token', 'secret', 'password', 'apikey', 'bearer'];
  
  // Create a deep copy to avoid mutating the original request objects
  const masked = JSON.parse(JSON.stringify(obj));

  const maskRecursive = (target: any) => {
    for (const key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          target[key] = '[REDACTED]';
        } else if (typeof target[key] === 'object' && target[key] !== null) {
          maskRecursive(target[key]);
        }
      }
    }
  };

  maskRecursive(masked);
  return masked;
}
