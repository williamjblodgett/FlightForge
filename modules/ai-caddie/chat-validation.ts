import { z } from "zod";

export const caddieChatSchema = z.object({
  message: z.string().trim().min(2).max(1200),
  roundKey: z.string().regex(/^[a-zA-Z0-9:_-]{2,120}$/u).optional(),
  holeNumber: z.number().int().min(1).max(36).optional(),
  conversationId: z.string().uuid().nullable().optional(),
});

export const realtimeSdpSchema = z.string().min(20).max(100_000);
