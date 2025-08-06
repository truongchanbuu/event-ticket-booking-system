export interface APIResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    hasMore: boolean;
    total: number;
    page: number;
    limit: number;
    nextCursor?: T;
  };
  message: string | undefined | null;
}

export interface GetParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
