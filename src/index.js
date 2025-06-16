import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectToDatabase from "./db/index.js";

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  IS_LOCAL: Number(process.env.IS_LOCAL),
};

if (env.IS_LOCAL) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: `.env.${env.NODE_ENV}.local` });
} else {
  dotenv.config();
}

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

const corsOptions = {
  origin: process.env.ORIGIN,
  credentials: true,
};
app.use(cors(corsOptions));

bootstrap();

async function bootstrap() {
  try {
    await connectToDatabase();

    const PORT = parseInt(process.env.PORT) || 3001;
    app.listen(PORT, () => {
      console.log(
        `App listening on port ${PORT} in the${env.IS_LOCAL ? " local" : ""} ${env.NODE_ENV} environment`,
      );
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
