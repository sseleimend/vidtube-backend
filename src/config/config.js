import express from "express";
import cors from "cors";

import { env } from "../utils/constants.js";
import "./envConfig.js";
import { responseFormatter } from "../middlewares/responseFormatter.middleware.js";
import healthcheckRouter from "../routes/healthcheck.routes.js";
import userRouter from "../routes/user.routes.js";
import cookieParser from "cookie-parser";
import { errorHandler } from "../middlewares/error.middleware.js";
import { StatusCodes } from "http-status-codes";

class App {
  #app = express();

  constructor() {
    this.#configure();
  }

  #configure() {
    this.#app.use(express.json({ limit: "16kb" }));
    this.#app.use(express.urlencoded({ extended: true, limit: "16kb" }));
    this.#app.use(express.static("public"));

    const corsOptions = {
      origin: process.env.ORIGIN,
      credentials: true,
    };
    this.#app.use(cors(corsOptions));

    this.#app.use(cookieParser());

    this.#app.use(responseFormatter);
  }

  routes() {
    this.#app.use("/api/v1/healthcheck", healthcheckRouter);
    this.#app.use("/api/v1/users", userRouter);

    return this;
  }

  error() {
    this.#app.use((req, res) => {
      res.status(StatusCodes.NOT_FOUND).json(null);
    });

    this.#app.use(errorHandler);

    return this;
  }

  listen() {
    const PORT = parseInt(process.env.PORT) || 3001;

    this.#app.listen(PORT, () => {
      console.log(
        `App listening on port ${PORT} in the${env.IS_LOCAL ? " local" : ""} ${env.NODE_ENV} environment`,
      );
    });
  }
}

export default new App();
