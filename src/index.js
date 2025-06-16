import express from "express";
import dotenv from "dotenv";

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

const PORT = parseInt(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(
    `App listening on port ${PORT} in the${env.IS_LOCAL ? " local" : ""} ${env.NODE_ENV} environment`,
  );
});

export { app };
