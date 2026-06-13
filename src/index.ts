import express from "express";
import authRoutes from "./routes/authRoutes";
import issuesRoutes from "./routes/issuesRoutes";
import { initDatabase } from "./config/db";
import { config } from "./config/env";

const app = express();
const port = config.port;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/issues", issuesRoutes);

app.get("/", (_req, res) => {
res.status(200).json({ success: true, message: "DevPulse backend is running" });
});

app.use((_req, res) => {
res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
res.status(500).json({ success: false, message: error.message || "Internal server error" });
});

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