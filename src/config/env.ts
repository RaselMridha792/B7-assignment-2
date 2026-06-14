import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  databaseUrl: string;
  databaseSsl: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  saltRounds: number;
  corsOrigin: string;
}

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/devpulse";
const isLocalDatabase = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

export const config: AppConfig = {
  port: Number(process.env.PORT || 5000),
  databaseUrl,
  databaseSsl: process.env.DATABASE_SSL ? process.env.DATABASE_SSL === "true" : !isLocalDatabase,
  jwtSecret: process.env.JWT_SECRET || "secret-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  saltRounds: 10,
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
