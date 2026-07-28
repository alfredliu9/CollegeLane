import { currentUser } from "@/lib/auth";
import { readState, writeState } from "@/lib/state";

function validKey(key: string) {
  return key.length > 0 && key.length <= 100 && /^[a-zA-Z0-9:_-]+$/.test(key);
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!validKey(key)) return Response.json({ error: "Invalid state key." }, { status: 400 });
  const value = await readState(user.id, key);
  if (value === undefined) return Response.json({ found: false });
  return Response.json({ found: true, value });
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { key?: string; value?: unknown } | null;
  const key = body?.key || "";
  if (!validKey(key)) return Response.json({ error: "Invalid state key." }, { status: 400 });
  const valueJson = JSON.stringify(body?.value);
  if (valueJson === undefined || valueJson.length > 250000)
    return Response.json({ error: "Saved data is too large." }, { status: 400 });
  const { updatedAt } = await writeState(user.id, key, body?.value);
  return Response.json({ saved: true, updatedAt });
}
