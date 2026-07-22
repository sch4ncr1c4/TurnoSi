const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

if (
  import.meta.env.PROD &&
  API_BASE_URL &&
  (!API_BASE_URL.startsWith("https://") ||
    /localhost|127\.0\.0\.1|ngrok/i.test(API_BASE_URL))
) {
  throw new Error("Unsafe VITE_API_URL for production");
}

export function getApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

type ApiFailure = {
  success: false;
  message: string;
  code: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (response.status === 204) {
    return undefined;
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await readResponseBody(response);
  const failure =
    body && typeof body === "object" && "success" in body && body.success === false
      ? (body as Partial<ApiFailure>)
      : null;

  if (!response.ok || failure) {
    throw new ApiError(
      failure?.message ?? (typeof body === "string" ? body : "Request failed"),
      failure?.code ?? "REQUEST_FAILED",
      response.status
    );
  }

  return body as T;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers
    }
  });

  if (response.status === 401 && retry && path !== "/api/v1/auth/refresh") {
    const refreshed = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });
    if (refreshed.ok) return apiRequest<T>(path, init, false);
  }

  return parseResponse<T>(response);
}

export function getApiHealth() {
  return apiRequest<{
    success: boolean;
    data: { status: string };
  }>("/api/v1/health");
}
