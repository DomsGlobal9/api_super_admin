import { GatewayError } from '../gateway/errors';

export function validatePayloadSize(req: Request, maxPayloadSize: number): void {
  // If it's a GET or HEAD, payload size is irrelevant
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
    return;
  }

  const contentLengthHeader = req.headers.get('content-length');
  if (!contentLengthHeader) {
    // If no content-length is provided but it's a POST/PUT, we might want to reject,
    // but some clients use chunked transfer encoding. For strict API Gateway, 
    // requiring Content-Length is safer to prevent endless streams.
    return;
  }

  const contentLength = parseInt(contentLengthHeader, 10);
  if (isNaN(contentLength)) {
    throw new GatewayError('INTERNAL_ERROR', 'Invalid Content-Length header', 400);
  }

  if (contentLength > maxPayloadSize) {
    throw new GatewayError(
      'PAYLOAD_TOO_LARGE',
      `Payload exceeds the maximum allowed size of ${maxPayloadSize} bytes`,
      413
    );
  }
}
