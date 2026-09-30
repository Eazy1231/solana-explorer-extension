import type { NavigationContext } from "../models/navigation";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

if (!BACKEND_URL) {
  console.warn(
    "VITE_BACKEND_URL is not configured. Blockchain and AI requests are disabled.",
  );
}

async function request<T>(path: string, body: unknown): Promise<T> {
  if (!BACKEND_URL) {
    throw new Error("Backend API is not configured.");
  }

  const response = await fetch(new URL(path, BACKEND_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchSolanaData(
  context: NavigationContext,
): Promise<unknown> {
  const path =
    context.resourceType === "account"
      ? "/v1/solana/account"
      : "/v1/solana/transaction";

  return request<unknown>(path, context);
}

export async function fetchAISummary(data: unknown): Promise<string> {
  const result = await request<{ summary: string }>("/v1/ai/summary", {
    data,
  });

  return result.summary;
}
