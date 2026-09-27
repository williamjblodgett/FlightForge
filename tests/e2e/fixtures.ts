import { test as base } from "@playwright/test";

// Each isolated browser represents a different player. Sharing localhost's rate-limit
// bucket makes a larger suite throttle unrelated accounts; production limits stay intact.
export const test = base.extend({
  context: async ({ context }, provideContext) => {
    if (process.env.FLIGHTFORGE_TEST_ISOLATED === "1") {
      const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 16).match(/.{4}/g)!.join(":");
      await context.setExtraHTTPHeaders({ "cf-connecting-ip": `2001:db8:${suffix}::1` });
    }
    await provideContext(context);
  },
});
