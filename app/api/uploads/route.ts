import { currentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Private Supabase Storage bucket (create it once in the dashboard).
const BUCKET = "uploads";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file"),
    kind = String(form.get("kind") || "");
  if (!(file instanceof File) || !["video", "transcript"].includes(kind))
    return Response.json({ error: "Choose a valid file." }, { status: 400 });
  const valid =
    kind === "video"
      ? file.type === "video/mp4" && file.size <= 100 * 1024 * 1024
      : file.type === "application/pdf" && file.size <= 10 * 1024 * 1024;
  if (!valid)
    return Response.json(
      { error: kind === "video" ? "Video must be an MP4 file no larger than 100 MB." : "Transcript must be a PDF no larger than 10 MB." },
      { status: 400 },
    );

  const db = createAdminClient();
  const id = crypto.randomUUID(),
    objectKey = `${user.id}/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(objectKey, file, { contentType: file.type, upsert: false });
  if (upErr) return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
  const { error: dbErr } = await db.from("user_uploads").insert({
    id,
    user_id: user.id,
    kind,
    filename: file.name,
    content_type: file.type,
    size: file.size,
    object_key: objectKey,
    created_at: Math.floor(Date.now() / 1000),
  });
  if (dbErr) return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
  return Response.json({ id, kind, filename: file.name, size: file.size, url: `/api/uploads?id=${id}` });
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return new Response("Not signed in.", { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  const db = createAdminClient();
  const { data: row } = await db
    .from("user_uploads")
    .select("filename,content_type,object_key")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return new Response("Not found.", { status: 404 });
  const { data: blob, error } = await db.storage.from(BUCKET).download(row.object_key);
  if (error || !blob) return new Response("Not found.", { status: 404 });
  return new Response(blob.stream(), {
    headers: {
      "Content-Type": row.content_type,
      "Content-Disposition": `attachment; filename="${row.filename.replaceAll('"', "")}"`,
    },
  });
}
