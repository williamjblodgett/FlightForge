export type MediaUploadDescriptor = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  consentToAnalyze: boolean;
  userIsMinor: boolean;
  guardianConsent: boolean;
};

export type MediaUploadDecision = {
  accepted: boolean;
  quarantineRequired: boolean;
  reasons: string[];
  retentionDays: number;
};

const allowedTypes = new Set(["image/jpeg", "image/png", "video/mp4", "video/quicktime"]);

export function evaluateMediaUpload(
  descriptor: MediaUploadDescriptor,
): MediaUploadDecision {
  const reasons: string[] = [];
  const isVideo = descriptor.mimeType.startsWith("video/");
  const maximumBytes = isVideo ? 250 * 1024 * 1024 : 15 * 1024 * 1024;
  if (!descriptor.consentToAnalyze) reasons.push("Analysis consent is required.");
  if (descriptor.userIsMinor && !descriptor.guardianConsent) {
    reasons.push("Guardian consent is required for identifiable minor media.");
  }
  if (!allowedTypes.has(descriptor.mimeType)) reasons.push("Unsupported media format.");
  if (descriptor.sizeBytes <= 0 || descriptor.sizeBytes > maximumBytes) {
    reasons.push("File size is outside the allowed range.");
  }
  if (isVideo && (descriptor.durationSeconds == null || descriptor.durationSeconds > 90)) {
    reasons.push("Coaching videos must be 90 seconds or shorter.");
  }

  return {
    accepted: reasons.length === 0,
    quarantineRequired: reasons.length === 0,
    reasons,
    retentionDays: 30,
  };
}
