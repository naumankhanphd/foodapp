import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, toErrorResponse } from "@/lib/auth/http.ts";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
}

export async function POST(request: Request) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const formData = await request.formData();
    const file = formData.get("file");
    const nameRaw = formData.get("name");

    if (!(file instanceof File)) {
      return Response.json({ message: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ message: "File too large. Maximum size is 5 MB." }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return Response.json(
        { message: "Unsupported file type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 },
      );
    }

    const basename = sanitizeFilename(String(nameRaw || "image"));
    const filename = `${basename}.${ext}`;

    const uploadDir = join(process.cwd(), "public", "images", "menu");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, filename), buffer);

    return Response.json({ url: `/images/menu/${filename}` });
  } catch (error) {
    return toErrorResponse(error);
  }
}
