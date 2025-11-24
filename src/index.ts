import { Hono } from "hono";
import notificationsControllers from "./controllers/notificationsControllers.ts";
import { connectDB } from "./config/mongo.ts";

// Inicializamos el servidor
const app = new Hono();

// Conectamos a la base de datos
connectDB().catch(error => {
  console.error("Failed to connect to the database:", error);
  process.exit(1);
});

app.route("/", notificationsControllers);

// SERVER
const port = 3000;
console.log(`Server is running on port ${port}`);
export default {
    port: port,
    fetch: app.fetch,
}