import { z } from "zod";

const email = z.string().email();

export function publicContacts() {
  const supportEmail = email.safeParse(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
  const privacyEmail = email.safeParse(process.env.NEXT_PUBLIC_PRIVACY_EMAIL);
  return {
    supportEmail: supportEmail.success ? supportEmail.data : null,
    privacyEmail: privacyEmail.success ? privacyEmail.data : null,
  };
}

export function isPublicRegistrationReady(): boolean {
  if (process.env.EMAIL_DELIVERY_MODE === "test") return true;
  const contacts = publicContacts();
  return Boolean(contacts.supportEmail && contacts.privacyEmail && process.env.LEGAL_TERMS_VERSION && process.env.LEGAL_PRIVACY_VERSION);
}

export function legalPolicyVersions(): { terms: string; privacy: string } | null {
  const terms = process.env.LEGAL_TERMS_VERSION?.trim();
  const privacy = process.env.LEGAL_PRIVACY_VERSION?.trim();
  return terms && privacy ? { terms, privacy } : null;
}
