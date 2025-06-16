import connectToDatabase from "./db/index.js";
import app from "./config/config.js";

bootstrap();

async function bootstrap() {
  try {
    await connectToDatabase();
    app.configure();
    app.listen();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
