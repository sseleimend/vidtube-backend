import connectToDatabase from "./db/index.js";
import app from "./config/config.js";

bootstrap();

async function bootstrap() {
  try {
    await connectToDatabase();
    app.routes().listen();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
