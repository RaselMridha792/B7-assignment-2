import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db";
import { config } from "../config/env";

const router = Router();
const JWT_SECRET = config.jwtSecret;
const SALT_ROUNDS = config.saltRounds;

router.post("/signup", async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({
      success: false,
      message: "Missing required fields",
      errors: [
        { field: "name", message: "Name is required" },
        { field: "email", message: "Email is required" },
        { field: "password", message: "Password is required" },
      ],
    });
    return;
  }

  if (role && role !== "contributor" && role !== "maintainer") {
    res.status(400).json({ success: false, message: "Invalid role", errors: [{ field: "role", message: "Role must be contributor or maintainer" }] });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const createdRole = role === "maintainer" ? "maintainer" : "contributor";

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, hashedPassword, createdRole]
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      res.status(409).json({ success: false, message: "Email already exists" });
      return;
    }
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: "Missing email or password" });
    return;
  }

  const result = await pool.query("SELECT id, name, email, role, password, created_at, updated_at FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user) {
    res.status(401).json({ success: false, message: "Invalid credentials" });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    res.status(401).json({ success: false, message: "Invalid credentials" });
    return;
  }

  const signOptions: jwt.SignOptions = { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] };
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, signOptions);
  delete user.password;

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user,
    },
  });
});

export default router;