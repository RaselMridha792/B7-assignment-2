import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import issuesRoutes from "./routes/issuesRoutes";
import { initDatabase } from "./config/db";
import { config } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sendSuccess } from "./utils/response";

const app = express();
const port = config.port;

app.use(express.json());

app.get("/", (_req, res) => {
  sendSuccess(res, 200, "DevPulse backend is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/issues", issuesRoutes);

// 404 for any unmatched route.
app.use(notFoundHandler);

// Centralized error handler — must be registered last.
app.use(errorHandler);

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed", error);
    process.exit(1);
  });
