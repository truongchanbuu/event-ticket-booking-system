export interface APIResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    hasMore: boolean;
    total: number;
    page: number;
    limit: number;
  };
}
