import { NextRequest, NextResponse } from "next/server";
import { ID } from "appwrite";

/**
 * POST /api/create-user
 * Creates a new Appwrite user using the server-side API key.
 * Requires APPWRITE_API_KEY in .env.local (server-only, no NEXT_PUBLIC_ prefix).
 */
export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
  }

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "APPWRITE_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const userId = ID.unique();

  const res = await fetch(`${endpoint}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
    },
    body: JSON.stringify({ userId, name, email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message ?? "Failed to create user" },
      { status: res.status }
    );
  }

  return NextResponse.json({ userId: data.$id, email: data.email, name: data.name });
}
