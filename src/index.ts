import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import issuesRoutes from "./modules/issues/issues.routes";
import { initDatabase } from "./config/db";
import { config } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sendSuccess } from "./utils/response";

const app = express();
const port = config.port;

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/", (_req, res) => {
  sendSuccess(res, 200, "DevPulse backend is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/issues", issuesRoutes);

app.use(notFoundHandler);


app.use(errorHandler);

initDatabase()
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed", error);
    process.exit(1);
  });
