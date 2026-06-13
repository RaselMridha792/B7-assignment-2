import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../config/db";
import { config } from "../../config/env";
import { sendSuccess } from "../../utils/response";
import { AppError } from "../../middleware/errorHandler";
import { LoginBody, PublicUser, SignupBody, UserRole, UserRow } from "../../types";

function isValidRole(role: unknown): role is UserRole {
  return role === "contributor" || role === "maintainer";
}

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = req.body as SignupBody;

  const errors: { field: string; message: string }[] = [];
  if (typeof name !== "string" || !name.trim()) errors.push({ field: "name", message: "Name is required" });
  if (typeof email !== "string" || !email.trim()) errors.push({ field: "email", message: "Email is required" });
  if (typeof password !== "string" || !password) errors.push({ field: "password", message: "Password is required" });
  if (role !== undefined && !isValidRole(role)) errors.push({ field: "role", message: "Role must be contributor or maintainer" });

  if (errors.length) {
    throw new AppError(400, "Validation failed", errors);
  }

  const hashedPassword = await bcrypt.hash(password as string, config.saltRounds);
  const createdRole: UserRole = isValidRole(role) ? role : "contributor";

  try {
    const result = await pool.query<PublicUser>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, hashedPassword, createdRole]
    );
    sendSuccess(res, 201, "User registered successfully", result.rows[0]);
  } catch (error: unknown) {
    // 23505 = unique_violation (duplicate email)
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505") {
      throw new AppError(400, "Email already exists", [{ field: "email", message: "Email is already registered" }]);
    }
    throw error;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginBody;

  if (typeof email !== "string" || !email || typeof password !== "string" || !password) {
    throw new AppError(400, "Email and password are required");
  }

  const result = await pool.query<UserRow>(
    "SELECT id, name, email, role, password, created_at, updated_at FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];

  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError(401, "Invalid credentials");
  }

  const signOptions: jwt.SignOptions = { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] };
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, config.jwtSecret, signOptions);

  const safeUser: PublicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  sendSuccess(res, 200, "Login successful", { token, user: safeUser });
}
