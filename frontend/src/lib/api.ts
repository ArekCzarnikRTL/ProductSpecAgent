const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ─── Domain Types ────────────────────────────────────────────────────────────

export type StepType = "IDEA" | "PROBLEM" | "TARGET_AUDIENCE" | "SCOPE" | "MVP" | "SPEC";
export type StepStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";
export type ProjectStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED";

export interface FlowStep {
  stepType: StepType;
  status: StepStatus;
  updatedAt: string;
}

export interface FlowState {
  projectId: string;
  steps: FlowStep[];
  currentStep: StepType;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectResponse {
  project: Project;
  flowState: FlowState;
}

export interface CreateProjectRequest {
  name: string;
  idea: string;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  message: string;
  flowStateChanged: boolean;
  currentStep: string;
  decisionId: string | null;
  clarificationId: string | null;
}

// ─── Clarification Types ─────────────────────────────────────────────────────

export type ClarificationStatus = "OPEN" | "ANSWERED";

export interface Clarification {
  id: string;
  projectId: string;
  stepType: StepType;
  question: string;
  reason: string;
  status: ClarificationStatus;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface AnswerClarificationRequest {
  answer: string;
}

// ─── Decision Types ──────────────────────────────────────────────────────────

export type DecisionStatus = "PENDING" | "RESOLVED";

export interface DecisionOption {
  id: string;
  label: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

export interface Decision {
  id: string;
  projectId: string;
  stepType: StepType;
  title: string;
  options: DecisionOption[];
  recommendation: string;
  status: DecisionStatus;
  chosenOptionId: string | null;
  rationale: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateDecisionRequest {
  title: string;
  stepType: StepType;
}

export interface ResolveDecisionRequest {
  chosenOptionId: string;
  rationale: string;
}

// ─── API Endpoints ──────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch("/api/health");
}

export async function listProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/api/v1/projects");
}

export async function createProject(data: CreateProjectRequest): Promise<ProjectResponse> {
  return apiFetch<ProjectResponse>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProject(id: string): Promise<ProjectResponse> {
  return apiFetch<ProjectResponse>(`/api/v1/projects/${id}`);
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/projects/${id}`, { method: "DELETE" });
}

export async function getFlowState(projectId: string): Promise<FlowState> {
  return apiFetch<FlowState>(`/api/v1/projects/${projectId}/flow`);
}

export async function sendChatMessage(projectId: string, data: ChatRequest): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`/api/v1/projects/${projectId}/agent/chat`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listDecisions(projectId: string): Promise<Decision[]> {
  return apiFetch<Decision[]>(`/api/v1/projects/${projectId}/decisions`);
}

export async function createDecision(projectId: string, data: CreateDecisionRequest): Promise<Decision> {
  return apiFetch<Decision>(`/api/v1/projects/${projectId}/decisions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getDecision(projectId: string, decisionId: string): Promise<Decision> {
  return apiFetch<Decision>(`/api/v1/projects/${projectId}/decisions/${decisionId}`);
}

export async function resolveDecision(projectId: string, decisionId: string, data: ResolveDecisionRequest): Promise<Decision> {
  return apiFetch<Decision>(`/api/v1/projects/${projectId}/decisions/${decisionId}/resolve`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listClarifications(projectId: string): Promise<Clarification[]> {
  return apiFetch<Clarification[]>(`/api/v1/projects/${projectId}/clarifications`);
}

export async function getClarification(projectId: string, clarificationId: string): Promise<Clarification> {
  return apiFetch<Clarification>(`/api/v1/projects/${projectId}/clarifications/${clarificationId}`);
}

export async function answerClarification(projectId: string, clarificationId: string, data: AnswerClarificationRequest): Promise<Clarification> {
  return apiFetch<Clarification>(`/api/v1/projects/${projectId}/clarifications/${clarificationId}/answer`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
