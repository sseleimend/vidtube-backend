import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  return res.status(StatusCodes.OK).json({
    message: "Health check passed",
  });
});

export { healthcheck };
