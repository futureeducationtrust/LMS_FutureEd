import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { authenticate } from "../../middleware/authenticate";
import { uploadFile } from "../../storage";
import path from "path";

// ─────────────────────────────────────────
// Validation is by MIME family OR extension, not an exact MIME whitelist.
// Real uploads arrive as audio/amr (Android call recorder), audio/x-wav
// (Windows), video/quicktime (iPhone) and very often application/octet-stream
// (Android file pickers) — all of which a strict list rejected with a 400
// that the client then swallowed. That was the "recording upload fails
// silently" bug.
// ─────────────────────────────────────────

const RECORDING_EXTENSIONS = new Set([
  ".mp3", ".m4a", ".aac", ".amr", ".wav", ".ogg", ".oga", ".opus", ".flac",
  ".wma", ".caf", ".3gp", ".3gpp", ".webm", ".mp4", ".mov", ".m4v", ".mkv",
]);
const DOCUMENT_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
const DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]);

// Call recordings of 20–30 minutes are 15–30 MB; documents stay small.
const RECORDING_MAX_BYTES = 50 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;

function isRecording(file: MultipartFile): boolean {
  const ext = path.extname(file.filename).toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  if (mime.startsWith("audio/") || mime.startsWith("video/")) return true;
  // Unknown/generic MIME from the picker — trust a known extension.
  return RECORDING_EXTENSIONS.has(ext);
}

function isDocument(file: MultipartFile): boolean {
  const ext = path.extname(file.filename).toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  if (DOCUMENT_TYPES.has(mime)) return true;
  return mime === "application/octet-stream" && DOCUMENT_EXTENSIONS.has(ext);
}

// Reads the multipart file, translating every failure into the API's JSON
// error shape so the client can show a precise message.
async function receiveFile(
  request: FastifyRequest,
  reply: FastifyReply,
  maxBytes: number,
): Promise<{ file: MultipartFile; buffer: Buffer } | null> {
  let file: MultipartFile | undefined;
  try {
    file = await request.file({ limits: { fileSize: maxBytes } });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    request.log.warn({ err }, "multipart parse failed");
    await reply.status(400).send({
      success: false,
      error: {
        code: "INVALID_UPLOAD",
        message:
          e.code === "FST_INVALID_MULTIPART_CONTENT_TYPE" || /boundary/i.test(e.message ?? "")
            ? "Upload was not sent as a file. Please retry."
            : "Could not read the uploaded file. Please retry.",
      },
    });
    return null;
  }
  if (!file) {
    await reply.status(400).send({
      success: false,
      error: { code: "INVALID_INPUT", message: "No file provided" },
    });
    return null;
  }

  let buffer: Buffer;
  try {
    buffer = await file.toBuffer();
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "FST_REQ_FILE_TOO_LARGE" || file.file.truncated) {
      await reply.status(413).send({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: `File is larger than ${mb(maxBytes)}. Please compress it or upload a shorter recording.`,
        },
      });
      return null;
    }
    request.log.error({ err }, "reading upload failed");
    await reply.status(400).send({
      success: false,
      error: { code: "INVALID_UPLOAD", message: "Could not read the uploaded file. Please retry." },
    });
    return null;
  }
  if (file.file.truncated || buffer.length > maxBytes) {
    await reply.status(413).send({
      success: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `File is larger than ${mb(maxBytes)}. Please compress it or upload a shorter recording.`,
      },
    });
    return null;
  }
  if (buffer.length === 0) {
    await reply.status(400).send({
      success: false,
      error: { code: "EMPTY_FILE", message: "The selected file is empty." },
    });
    return null;
  }
  return { file, buffer };
}

async function storeOrFail(
  request: FastifyRequest,
  reply: FastifyReply,
  params: { buffer: Buffer; fileName: string; mimeType: string; folder: string },
) {
  try {
    const result = await uploadFile(params);
    return reply.status(200).send({ success: true, data: { url: result.url, key: result.key } });
  } catch (err) {
    request.log.error({ err, folder: params.folder }, "storage upload failed");
    const msg = (err as Error).message ?? "";
    return reply.status(502).send({
      success: false,
      error: {
        code: "STORAGE_ERROR",
        message: /not configured/i.test(msg)
          ? "File storage is not configured on the server. Contact your admin."
          : "Could not save the file to storage. Please try again in a moment.",
      },
    });
  }
}

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────
  // POST /upload/recording
  // Employee uploads call recording → URL to store in InteractionLog
  // ─────────────────────────────────────────
  fastify.post("/recording", { preHandler: authenticate }, async (request, reply) => {
    const received = await receiveFile(request, reply, RECORDING_MAX_BYTES);
    if (!received) return;
    const { file, buffer } = received;

    if (!isRecording(file)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: `"${file.filename}" doesn't look like an audio or video file (received ${file.mimetype || "unknown type"}). Use mp3, m4a, amr, wav, ogg, 3gp or mp4.`,
        },
      });
    }

    const ext = path.extname(file.filename).toLowerCase() || ".bin";
    // Generic MIME from the picker → derive something playable from the extension.
    const mimeType =
      file.mimetype && file.mimetype !== "application/octet-stream"
        ? file.mimetype
        : ({ ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".amr": "audio/amr", ".wav": "audio/wav",
            ".ogg": "audio/ogg", ".oga": "audio/ogg", ".opus": "audio/ogg", ".flac": "audio/flac", ".3gp": "audio/3gpp",
            ".3gpp": "audio/3gpp", ".webm": "audio/webm", ".mp4": "video/mp4", ".mov": "video/quicktime" } as Record<string, string>)[ext]
          ?? "application/octet-stream";

    return storeOrFail(request, reply, {
      buffer,
      fileName: `${Date.now()}-recording${ext}`,
      mimeType,
      folder: "recordings",
    });
  });

  // ─────────────────────────────────────────
  // POST /upload/document
  // Employee uploads student document → URL to store in LeadDocument
  // ─────────────────────────────────────────
  fastify.post("/document", { preHandler: authenticate }, async (request, reply) => {
    const received = await receiveFile(request, reply, DOCUMENT_MAX_BYTES);
    if (!received) return;
    const { file, buffer } = received;

    if (!isDocument(file)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: `"${file.filename}" must be a PDF, JPG or PNG (received ${file.mimetype || "unknown type"}).`,
        },
      });
    }

    const ext = path.extname(file.filename).toLowerCase();
    return storeOrFail(request, reply, {
      buffer,
      fileName: `${Date.now()}-doc${ext}`,
      mimeType: file.mimetype === "application/octet-stream" ? (ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg") : file.mimetype,
      folder: "documents",
    });
  });
}
