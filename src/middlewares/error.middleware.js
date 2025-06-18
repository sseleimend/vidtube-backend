import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;
  if (!(err instanceof ApiError)) {
    const statusCode =
      err.statusCode || (err instanceof mongoose.Error ? 400 : 500);
    const message = err.message || "Something went wrong";
    error = new ApiError(statusCode, message, err?.errors || null, err.stack);
  }

  const response = {
    message: error.message,
    ...(process.env.NODE_ENV !== "production" && {
      stack: error.stack,
      errors: error.errors,
    }),
  };

  return res.status(error.statusCode).json(response);
};

export { errorHandler };
