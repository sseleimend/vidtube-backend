import { ApiResponse } from "../utils/ApiResponse.js";

function responseFormatter(req, res, next) {
  const originalJson = res.json;

  res.json = (data) => {
    const response = new ApiResponse(res.statusCode, data);

    originalJson.call(res, response);
  };

  next();
}

export { responseFormatter };
