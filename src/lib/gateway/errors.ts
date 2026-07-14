export type GatewayErrorCode =
  | 'UNAUTHORIZED_API_KEY'
  | 'ACCESS_DENIED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVICE_UNAVAILABLE'
  | 'SERVICE_BUSY'
  | 'GATEWAY_TIMEOUT'
  | 'INTERNAL_ERROR';

export class GatewayError extends Error {
  public code: GatewayErrorCode;
  public statusCode: number;

  constructor(code: GatewayErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'GatewayError';
  }
}

export function createErrorResponse(error: GatewayError | Error, requestId?: string) {
  if (error instanceof GatewayError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      {
        status: error.statusCode,
        headers: requestId ? { 'X-Request-ID': requestId } : {},
      }
    );
  }

  // Fallback for unexpected errors
  return Response.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred in the gateway.',
      },
    },
    {
      status: 500,
      headers: requestId ? { 'X-Request-ID': requestId } : {},
    }
  );
}
