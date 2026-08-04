const MAX_CLAIM_EVIDENCE_BYTES = 5 * 1024 * 1024;

export type ValidatedEvidence = {
  extension: "pdf" | "png" | "jpg";
  contentType: "application/pdf" | "image/png" | "image/jpeg";
  bytes: ArrayBuffer;
};

const allowedExtensions = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
} as const;

export class ClaimEvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimEvidenceError";
  }
}

export async function validateClaimEvidence(file: File): Promise<ValidatedEvidence> {
  if (file.size <= 0) throw new ClaimEvidenceError("The evidence file is empty.");
  if (file.size > MAX_CLAIM_EVIDENCE_BYTES) {
    throw new ClaimEvidenceError("Evidence files must be 5 MB or smaller.");
  }

  const bytes = await file.arrayBuffer();
  const signature = new Uint8Array(bytes.slice(0, 12));
  const detected = detectEvidenceType(signature, bytes);
  const reportedExtension = file.name.split(".").at(-1)?.toLowerCase();
  const reportedContentType = file.type.toLowerCase();
  if (!reportedExtension || !(reportedExtension in allowedExtensions)) {
    throw new ClaimEvidenceError("The evidence filename must end in .pdf, .png, .jpg, or .jpeg.");
  }
  const expectedContentType = allowedExtensions[reportedExtension as keyof typeof allowedExtensions];
  if (reportedContentType !== detected.contentType || expectedContentType !== detected.contentType) {
    throw new ClaimEvidenceError("The evidence filename, MIME type, and file signature do not match.");
  }
  return detected;
}

function detectEvidenceType(signature: Uint8Array, bytes: ArrayBuffer): ValidatedEvidence {
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
