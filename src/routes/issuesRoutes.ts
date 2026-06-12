import { Router, Response } from "express";
import pool from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  const { title, description, type } = req.body;

  if (!title || !description || !type) {
    res.status(400).json({ success: false, message: "Missing required fields", errors: [{ field: "title|description|type", message: "Title, description, and type are required" }] });
    return;
  }

  if (title.length > 150) {
    res.status(400).json({ success: false, message: "Title is too long", errors: [{ field: "title", message: "Title must not exceed 150 characters" }] });
    return;
  }

  if (description.length < 20) {
    res.status(400).json({ success: false, message: "Description is too short", errors: [{ field: "description", message: "Description must contain at least 20 characters" }] });
    return;
  }

  if (type !== "bug" && type !== "feature_request") {
    res.status(400).json({ success: false, message: "Invalid issue type", errors: [{ field: "type", message: "Type must be bug or feature_request" }] });
    return;
  }

  const result = await pool.query(
    `INSERT INTO issues (title, description, type, reporter_id) VALUES ($1, $2, $3, $4) RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
    [title, description, type, user.id]
  );

  res.status(201).json({ success: true, message: "Issue created successfully", data: result.rows[0] });
});

router.get("/", async (req: AuthRequest, res: Response) => {
  const rawSort = req.query.sort;
  const rawType = req.query.type;
  const rawStatus = req.query.status;
  const sort = Array.isArray(rawSort) ? rawSort[0] : rawSort || "newest";
  const type = Array.isArray(rawType) ? rawType[0] : rawType;
  const status = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;

  const orderBy = sort === "oldest" ? "ASC" : "DESC";
  const filters: string[] = [];
  const values: (string | number)[] = [];

  if (type) {
    if (type !== "bug" && type !== "feature_request") {
      res.status(400).json({ success: false, message: "Invalid type filter" });
      return;
    }
    values.push(type as string);
    filters.push(`type = $${values.length}`);
  }

  if (status) {
    if (status !== "open" && status !== "in_progress" && status !== "resolved") {
      res.status(400).json({ success: false, message: "Invalid status filter" });
      return;
    }
    values.push(status as string);
    filters.push(`status = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const issuesQuery = `SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues ${whereClause} ORDER BY created_at ${orderBy}`;
  const issuesResult = await pool.query(issuesQuery, values);
  const issues = issuesResult.rows;

  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];
  const reporterMap: Record<number, { id: number; name: string; role: string }> = {};

  if (reporterIds.length) {
    const reportersResult = await pool.query(`SELECT id, name, role FROM users WHERE id = ANY($1::int[])`, [reporterIds]);
    reportersResult.rows.forEach((reporter) => {
      reporterMap[reporter.id] = { id: reporter.id, name: reporter.name, role: reporter.role };
    });
  }

  const responseIssues = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter: reporterMap[issue.reporter_id] || null,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  }));

  res.status(200).json({ success: true, message: "Issues retrieved successfully", data: responseIssues });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const issueId = Number(req.params.id);
  if (Number.isNaN(issueId) || issueId <= 0) {
    res.status(400).json({ success: false, message: "Invalid issue ID" });
    return;
  }

  const issueResult = await pool.query("SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1", [issueId]);
  const issue = issueResult.rows[0];

  if (!issue) {
    res.status(404).json({ success: false, message: "Issue not found" });
    return;
  }

  const reporterResult = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [issue.reporter_id]);
  const reporter = reporterResult.rows[0] || null;

  res.status(200).json({
    success: true,
    message: "Issue retrieved successfully",
    data: {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    },
  });
});

router.patch("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  const issueId = Number(req.params.id);
  if (Number.isNaN(issueId) || issueId <= 0) {
    res.status(400).json({ success: false, message: "Invalid issue ID" });
    return;
  }

  const { title, description, type, status } = req.body;
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (title !== undefined) {
    if (!title || title.length > 150) {
      res.status(400).json({ success: false, message: "Invalid title" });
      return;
    }
    values.push(title);
    fields.push(`title = $${values.length}`);
  }

  if (description !== undefined) {
    if (!description || description.length < 20) {
      res.status(400).json({ success: false, message: "Invalid description" });
      return;
    }
    values.push(description);
    fields.push(`description = $${values.length}`);
  }

  if (type !== undefined) {
    if (type !== "bug" && type !== "feature_request") {
      res.status(400).json({ success: false, message: "Invalid type" });
      return;
    }
    values.push(type);
    fields.push(`type = $${values.length}`);
  }

  if (status !== undefined) {
    if (status !== "open" && status !== "in_progress" && status !== "resolved") {
      res.status(400).json({ success: false, message: "Invalid status" });
      return;
    }
    if (user.role !== "maintainer") {
      res.status(403).json({ success: false, message: "Only maintainers can change issue status" });
      return;
    }
    values.push(status);
    fields.push(`status = $${values.length}`);
  }

  if (!fields.length) {
    res.status(400).json({ success: false, message: "No valid fields to update" });
    return;
  }

  const issueResult = await pool.query("SELECT id, reporter_id FROM issues WHERE id = $1", [issueId]);
  const issue = issueResult.rows[0];
  if (!issue) {
    res.status(404).json({ success: false, message: "Issue not found" });
    return;
  }

  if (user.role === "contributor" && issue.reporter_id !== user.id) {
    res.status(403).json({ success: false, message: "Contributors can only update their own issues" });
    return;
  }

  values.push(issueId);
  const updateQuery = `UPDATE issues SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`;
  const updatedIssueResult = await pool.query(updateQuery, values);

  res.status(200).json({ success: true, message: "Issue updated successfully", data: updatedIssueResult.rows[0] });
});

router.delete("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  if (user.role !== "maintainer") {
    res.status(403).json({ success: false, message: "Only maintainers can delete issues" });
    return;
  }

  const issueId = Number(req.params.id);
  if (Number.isNaN(issueId) || issueId <= 0) {
    res.status(400).json({ success: false, message: "Invalid issue ID" });
    return;
  }

  const deleteResult = await pool.query("DELETE FROM issues WHERE id = $1 RETURNING id", [issueId]);
  if (!deleteResult.rowCount) {
    res.status(404).json({ success: false, message: "Issue not found" });
    return;
  }

  res.status(200).json({ success: true, message: "Issue deleted successfully" });
});

export default router;