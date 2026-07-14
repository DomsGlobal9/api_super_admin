import { NextRequest } from 'next/server';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(req: NextRequest, defaultPageSize = 20): PaginationParams {
  const url = new URL(req.url);
  const pageStr = url.searchParams.get('page');
  const pageSizeStr = url.searchParams.get('pageSize');

  const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1;
  const pageSize = pageSizeStr ? Math.max(1, parseInt(pageSizeStr, 10)) : defaultPageSize;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildPaginationMeta(total: number, params: PaginationParams) {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
