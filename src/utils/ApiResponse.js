import { getReasonPhrase } from "http-status-codes";

class ApiResponse {
  constructor(statusCode, data) {
    this.isSuccess = statusCode < 400;
    this.statusCode = statusCode;
    this.status = getReasonPhrase(statusCode);
    this.data = data;
  }
}

export { ApiResponse };
