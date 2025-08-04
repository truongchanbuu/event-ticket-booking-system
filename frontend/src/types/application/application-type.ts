export interface ApplicationFetchOptions {
  status?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc"; // Thêm các thuộc tính có thể có
}

export type ApplicationQueryKey = [string, ApplicationFetchOptions | undefined];
