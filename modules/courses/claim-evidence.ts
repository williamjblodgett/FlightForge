import { getPrivateMediaBucket } from "@/db/runtime";

const MAX_CLAIM_EVIDENCE_BYTES = 5 * 1024 * 1024;

type ValidatedEvidence = {
  extension: "pdf" | "png" | "jpg";
  contentType: "application/pdf" | "image/png" | "image/jpeg";
  bytes: ArrayBuffer;
};

export class ClaimEvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimEvidenceError";
  }
}

export async function storeClaimEvidence(
  file: File,
  userId: string,
  courseId: string,
): Promise<string> {
  const validated = await validateClaimEvidence(file);
  const safeUserId = userId.replaceAll(/[^a-zA-Z0-9:_-]/gu, "_");
  const key = `course-claims/${safeUserId}/${crypto.randomUUID()}.${validated.extension}`;
  await getPrivateMediaBucket().put(key, validated.bytes, {
    httpMetadata: { contentType: validated.contentType },
    customMetadata: {
      ownerId: userId,
      courseId,
      originalName: sanitizeFileName(file.name),
      uploadedAt: new Date().toISOString(),
    },
  });
  return key;
}

export async function deleteClaimEvidence(key: string): Promise<void> {
  await getPrivateMediaBucket().delete(key);
}

export async function getClaimEvidence(key: string): Promise<R2ObjectBody | null> {
  return getPrivateMediaBucket().get(key);
}

async function validateClaimEvidence(file: File): Promise<ValidatedEvidence> {
  if (file.size <= 0) throw new ClaimEvidenceError("The evidence file is empty.");
  if (file.size > MAX_CLAIM_EVIDENCE_BYTES) {
    throw new ClaimEvidenceError("Evidence files must be 5 MB or smaller.");
  }

  const bytes = await file.arrayBuffer();
  const signature = new Uint8Array(bytes.slice(0, 12));
  if (startsWith(signature, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { extension: "pdf", contentType: "application/pdf", bytes };
  }
  if (startsWith(signature, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: "png", contentType: "image/png", bytes };
  }
  if (startsWith(signature, [0xff, 0xd8, 0xff])) {
    return { extension: "jpg", contentType: "image/jpeg", bytes };
  }

  throw new ClaimEvidenceError("Upload a PDF, PNG, or JPEG with a valid file signature.");
}

function startsWith(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

function sanitizeFileName(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._ -]/gu, "_").slice(0, 120);
}
