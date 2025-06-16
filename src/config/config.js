import dotenv from "dotenv";
import cors from "cors";

import { env } from "../constants.js";

if (env.IS_LOCAL) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: `.env.${env.NODE_ENV}.local` });
} else {
  dotenv.config();
}

function configureApp(app) {
  const corsOptions = {
    origin: process.env.ORIGIN,
    credentials: true,
  };
  app.use(cors(corsOptions));
}

export default configureApp;
