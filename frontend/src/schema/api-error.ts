export interface ApiResponseError {
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: any[];
}
