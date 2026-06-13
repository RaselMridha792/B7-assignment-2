// Shared domain + request/response types used across modules.

export type UserRole = "contributor" | "maintainer";
export type IssueType = "bug" | "feature_request";
export type IssueStatus = "open" | "in_progress" | "resolved";

// ---- Database row shapes ----

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// User as exposed in responses (never includes password).
export type PublicUser = Omit<UserRow, "password">;

export interface ReporterSummary {
  id: number;
  name: string;
  role: UserRole;
}

export interface IssueRow {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: string;
  updated_at: string;
}

// Issue shape returned by list/detail endpoints (reporter nested, no reporter_id).
export interface IssueWithReporter {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter: ReporterSummary | null;
  created_at: string;
  updated_at: string;
}

// ---- Request body shapes ----

export interface SignupBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
}

export interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export interface CreateIssueBody {
  title?: unknown;
  description?: unknown;
  type?: unknown;
}

export interface UpdateIssueBody {
  title?: unknown;
  description?: unknown;
  type?: unknown;
  status?: unknown;
}

// ---- Issues list query params ----

export interface IssueListQuery {
  sort?: string;
  type?: string;
  status?: string;
}
