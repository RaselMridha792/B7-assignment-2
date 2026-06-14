import { Response } from "express";
import pool from "../../config/db";
import { sendSuccess } from "../../utils/response";
import { AppError } from "../../middleware/errorHandler";
import { AuthRequest } from "../../middleware/auth";
import {
  CreateIssueBody,
  IssueRow,
  IssueStatus,
  IssueType,
  IssueWithReporter,
  ReporterSummary,
  UpdateIssueBody,
} from "../../types";

const VALID_TYPES: IssueType[] = ["bug", "feature_request"];
const VALID_STATUSES: IssueStatus[] = ["open", "in_progress", "resolved"];

const ISSUE_COLUMNS = "id, title, description, type, status, reporter_id, created_at, updated_at";

function isIssueType(value: unknown): value is IssueType {
  return typeof value === "string" && (VALID_TYPES as string[]).includes(value);
}

function isIssueStatus(value: unknown): value is IssueStatus {
  return typeof value === "string" && (VALID_STATUSES as string[]).includes(value);
}

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

async function fetchReporters(ids: number[]): Promise<Map<number, ReporterSummary>> {
  const map = new Map<number, ReporterSummary>();
  if (!ids.length) return map;

  const result = await pool.query<ReporterSummary>(
    "SELECT id, name, role FROM users WHERE id = ANY($1::int[])",
    [ids]
  );
  result.rows.forEach((reporter) => map.set(reporter.id, reporter));
  return map;
}

function toIssueWithReporter(issue: IssueRow, reporter: ReporterSummary | null): IssueWithReporter {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
}

export async function createIssue(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, "Authentication required");

  const { title, description, type } = req.body as CreateIssueBody;

  const errors: { field: string; message: string }[] = [];
  if (typeof title !== "string" || !title.trim()) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (title.length > 150) {
    errors.push({ field: "title", message: "Title must not exceed 150 characters" });
  }
  if (typeof description !== "string" || description.trim().length < 20) {
    errors.push({ field: "description", message: "Description must contain at least 20 characters" });
  }
  if (!isIssueType(type)) {
    errors.push({ field: "type", message: "Type must be bug or feature_request" });
  }

  if (errors.length) {
    throw new AppError(400, "Validation failed", errors);
  }

  const result = await pool.query<IssueRow>(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${ISSUE_COLUMNS}`,
    [title, description, type, user.id]
  );

  sendSuccess(res, 201, "Issue created successfully", result.rows[0]);
}

export async function getAllIssues(req: AuthRequest, res: Response): Promise<void> {
  const sort = firstQueryValue(req.query.sort) ?? "newest";
  const type = firstQueryValue(req.query.type);
  const status = firstQueryValue(req.query.status);

  const orderBy = sort === "oldest" ? "ASC" : "DESC";
  const filters: string[] = [];
  const values: (string | number)[] = [];

  if (type !== undefined) {
    if (!isIssueType(type)) throw new AppError(400, "Invalid type filter");
    values.push(type);
    filters.push(`type = $${values.length}`);
  }

  if (status !== undefined) {
    if (!isIssueStatus(status)) throw new AppError(400, "Invalid status filter");
    values.push(status);
    filters.push(`status = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const issuesResult = await pool.query<IssueRow>(
    `SELECT ${ISSUE_COLUMNS} FROM issues ${whereClause} ORDER BY created_at ${orderBy}`,
    values
  );
  const issues = issuesResult.rows;

  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];
  const reporters = await fetchReporters(reporterIds);

  const data = issues.map((issue) => toIssueWithReporter(issue, reporters.get(issue.reporter_id) ?? null));

  sendSuccess(res, 200, "Issues retrieved successfully", data);
}

function parseIssueId(raw: string): number {
  const issueId = Number(raw);
  if (!Number.isInteger(issueId) || issueId <= 0) {
    throw new AppError(400, "Invalid issue ID");
  }
  return issueId;
}

export async function getIssue(req: AuthRequest, res: Response): Promise<void> {
  const issueId = parseIssueId(req.params.id);

  const issueResult = await pool.query<IssueRow>(
    `SELECT ${ISSUE_COLUMNS} FROM issues WHERE id = $1`,
    [issueId]
  );
  const issue = issueResult.rows[0];
  if (!issue) throw new AppError(404, "Issue not found");

  const reporters = await fetchReporters([issue.reporter_id]);

  sendSuccess(res, 200, "Issue retrieved successfully", toIssueWithReporter(issue, reporters.get(issue.reporter_id) ?? null));
}

export async function updateIssue(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, "Authentication required");

  const issueId = parseIssueId(req.params.id);
  const { title, description, type, status } = req.body as UpdateIssueBody;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim() || title.length > 150) {
      throw new AppError(400, "Invalid title", [{ field: "title", message: "Title is required and must not exceed 150 characters" }]);
    }
    values.push(title);
    fields.push(`title = $${values.length}`);
  }

  if (description !== undefined) {
    if (typeof description !== "string" || description.trim().length < 20) {
      throw new AppError(400, "Invalid description", [{ field: "description", message: "Description must contain at least 20 characters" }]);
    }
    values.push(description);
    fields.push(`description = $${values.length}`);
  }

  if (type !== undefined) {
    if (!isIssueType(type)) {
      throw new AppError(400, "Invalid type", [{ field: "type", message: "Type must be bug or feature_request" }]);
    }
    values.push(type);
    fields.push(`type = $${values.length}`);
  }

  if (status !== undefined) {
    if (!isIssueStatus(status)) {
      throw new AppError(400, "Invalid status", [{ field: "status", message: "Status must be open, in_progress, or resolved" }]);
    }
    if (user.role !== "maintainer") {
      throw new AppError(403, "Only maintainers can change issue status");
    }
    values.push(status);
    fields.push(`status = $${values.length}`);
  }

  if (!fields.length) {
    throw new AppError(400, "No valid fields to update");
  }

  const issueResult = await pool.query<Pick<IssueRow, "id" | "reporter_id" | "status">>(
    "SELECT id, reporter_id, status FROM issues WHERE id = $1",
    [issueId]
  );
  const issue = issueResult.rows[0];
  if (!issue) throw new AppError(404, "Issue not found");

  if (user.role !== "maintainer") {
    if (issue.reporter_id !== user.id) {
      throw new AppError(403, "Contributors can only update their own issues");
    }
    if (issue.status !== "open") {
      throw new AppError(409, "Issue can no longer be edited because it is not open");
    }
  }

  values.push(issueId);
  const updatedResult = await pool.query<IssueRow>(
    `UPDATE issues SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING ${ISSUE_COLUMNS}`,
    values
  );

  sendSuccess(res, 200, "Issue updated successfully", updatedResult.rows[0]);
}

export async function deleteIssue(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) throw new AppError(401, "Authentication required");

  if (user.role !== "maintainer") {
    throw new AppError(403, "Only maintainers can delete issues");
  }

  const issueId = parseIssueId(req.params.id);

  const deleteResult = await pool.query("DELETE FROM issues WHERE id = $1 RETURNING id", [issueId]);
  if (!deleteResult.rowCount) {
    throw new AppError(404, "Issue not found");
  }

  sendSuccess(res, 200, "Issue deleted successfully");
}
