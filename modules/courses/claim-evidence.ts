import { getPrivateMediaBucket } from "@/db/runtime";
import { validateClaimEvidence } from "./claim-evidence-validation";

export {
  ClaimEvidenceError,
  validateClaimEvidence,
} from "./claim-evidence-validation";

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

function sanitizeFileName(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._ -]/gu, "_").slice(0, 120);
}
