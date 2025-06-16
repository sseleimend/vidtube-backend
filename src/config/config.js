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

const app = express();

function configure() {
  app.use(express.json({ limit: "16kb" }));
  app.use(express.urlencoded({ extended: true, limit: "16kb" }));
  app.use(express.static("public"));

  const corsOptions = {
    origin: process.env.ORIGIN,
    credentials: true,
  };
  app.use(cors(corsOptions));

  return app;
}

function listen() {
  const PORT = parseInt(process.env.PORT) || 3001;

  app.listen(PORT, () => {
    console.log(
      `App listening on port ${PORT} in the${env.IS_LOCAL ? " local" : ""} ${env.NODE_ENV} environment`,
    );
  });

  return app;
}

export default {
  configure,
  listen,
};
