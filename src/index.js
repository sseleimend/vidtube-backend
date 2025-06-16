import express from "express";

import connectToDatabase from "./db/index.js";
import configureApp from "./config/config.js";
import { env } from "./constants.js";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

configureApp(app);

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
