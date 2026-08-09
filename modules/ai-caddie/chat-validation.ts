import { z } from "zod";

export const caddieChatSchema = z.object({
  message: z.string().trim().min(2).max(1200),
  conversationId: z.string().uuid().nullable().optional(),
});

export const realtimeSdpSchema = z.string().min(20).max(100_000);
