import { describe, expect, it } from "vitest";
import { caddieChatSchema, realtimeSdpSchema } from "./chat-validation";

describe("caddie chat validation", () => {
  it("accepts a bounded question and rejects oversized messages", () => {
    expect(caddieChatSchema.safeParse({ message: "Help with this headwind", conversationId: null }).success).toBe(true);
    expect(caddieChatSchema.safeParse({ message: "x".repeat(1201) }).success).toBe(false);
  });

  it("rejects empty or implausibly large realtime offers", () => {
    expect(realtimeSdpSchema.safeParse("v=0\r\no=- 123 2 IN IP4 127.0.0.1").success).toBe(true);
    expect(realtimeSdpSchema.safeParse("").success).toBe(false);
  });
});
