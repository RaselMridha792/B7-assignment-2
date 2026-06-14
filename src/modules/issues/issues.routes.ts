import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, AuthRequest } from "../../middleware/auth";
import { createIssue, getAllIssues, getIssue, updateIssue, deleteIssue } from "./issues.controller";

const router = Router();

router.get("/", asyncHandler<AuthRequest>(getAllIssues));
router.get("/:id", asyncHandler<AuthRequest>(getIssue));

router.post("/", authenticateToken, asyncHandler<AuthRequest>(createIssue));
router.patch("/:id", authenticateToken, asyncHandler<AuthRequest>(updateIssue));
router.delete("/:id", authenticateToken, asyncHandler<AuthRequest>(deleteIssue));

export default router;
