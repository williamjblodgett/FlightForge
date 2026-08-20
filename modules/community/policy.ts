export type MessagePrivacy = "NO_ONE" | "CONNECTIONS" | "EVERYONE";

export function canonicalConnectionPair(firstUserId: string, secondUserId: string): string {
  return [firstUserId, secondUserId].sort().join(":");
}

export function canStartConversation(input: {
  targetPrivacy: MessagePrivacy;
  connected: boolean;
  blockedEitherWay: boolean;
  targetAdultAttested: boolean;
  sameUser?: boolean;
}): boolean {
  if (input.sameUser || input.blockedEitherWay || !input.targetAdultAttested) return false;
  if (input.targetPrivacy === "NO_ONE") return false;
  return input.targetPrivacy === "EVERYONE" || input.connected;
}

export function canSendMessage(input: {
  member: boolean;
  left: boolean;
  adultAttested: boolean;
  suspended: boolean;
  muted: boolean;
  blockedParticipant: boolean;
}): boolean {
  return input.member && !input.left && input.adultAttested && !input.suspended && !input.muted && !input.blockedParticipant;
}

export function validIdempotencyKey(value: string | null): value is string {
  return Boolean(value && value.length >= 16 && value.length <= 100 && /^[A-Za-z0-9._:-]+$/u.test(value));
}
