import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { env } from "../utils/constants.js";

if (env.IS_LOCAL) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: `.env.${env.NODE_ENV}.local` });
} else {
  dotenv.config();
}

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
  }

  routes() {
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
