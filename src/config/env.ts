import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  saltRounds: number;
}

export const config: AppConfig = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/devpulse",
  jwtSecret: process.env.JWT_SECRET || "secret-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  // bcrypt salt rounds — kept within the required 8–12 range
  saltRounds: 10,
};
