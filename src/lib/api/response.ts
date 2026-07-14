import { NextResponse } from 'next/server';

export type SuccessResponse<T> = {
  success: true;
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export const ok = <T>(data: T, pagination?: SuccessResponse<T>['pagination']) => {
  return NextResponse.json({ success: true, data, pagination }, { status: 200 });
};

export const created = <T>(data: T) => {
  return NextResponse.json({ success: true, data }, { status: 201 });
};

export const badRequest = (code: string, message: string, details?: any) => {
  return NextResponse.json({ success: false, error: { code, message, details } }, { status: 400 });
};

export const unauthorized = (code: string = 'UNAUTHORIZED', message: string = 'Authentication required') => {
  return NextResponse.json({ success: false, error: { code, message } }, { status: 401 });
};

export const forbidden = (code: string = 'FORBIDDEN', message: string = 'Permission denied') => {
  return NextResponse.json({ success: false, error: { code, message } }, { status: 403 });
};

export const notFound = (code: string = 'NOT_FOUND', message: string = 'Resource not found') => {
  return NextResponse.json({ success: false, error: { code, message } }, { status: 404 });
};

export const conflict = (code: string = 'CONFLICT', message: string = 'Resource conflict') => {
  return NextResponse.json({ success: false, error: { code, message } }, { status: 409 });
};

export const serverError = (code: string = 'INTERNAL_ERROR', message: string = 'An unexpected error occurred', details?: any) => {
  return NextResponse.json({ success: false, error: { code, message, details } }, { status: 500 });
};
