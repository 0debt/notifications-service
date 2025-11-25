import { Hono } from "hono";
import { connectDB } from "./config/mongo.ts";
import { getPreferences, setPreferences, sendNotification, getNotifications } from "./controllers/notificationsControllers.ts";



const app = new Hono();

// Conectamos a la base de datos
connectDB().catch(error => {
  console.error("Failed to connect to the database:", error);
  process.exit(1);
});

// RUTAS
app.get("/preferences/:userId", getPreferences);
app.post("/preferences", setPreferences);
app.post("/notifications", sendNotification);
app.get("/notifications/:userId", getNotifications);

// SERVER
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
