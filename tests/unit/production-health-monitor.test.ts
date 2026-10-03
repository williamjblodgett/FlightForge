import { describe, expect, it, vi } from "vitest";
import { INCIDENT_MARKER, fingerprint, probeProduction, reconcileIncident, runMonitor } from "../../scripts/production-health.mjs";

const healthy = { healthy:true, failures:[] as string[], release:"abcdef0123", origin:"https://example.com" };
const degraded = { ...healthy, healthy:false, failures:["authentication_unavailable"] };
function api(issues: unknown[] = []) {
  return { paginate:vi.fn().mockResolvedValue(issues), rest:{ issues:{ listForRepo:vi.fn(), create:vi.fn().mockResolvedValue({data:{number:7}}), update:vi.fn(), createComment:vi.fn() } } };
}
const repo = { owner:"owner", repo:"repo" };
const context = { repo, runId:1 };
const args = { repo, report:degraded, runUrl:"https://github.com/owner/repo/actions/runs/1", checkedAt:"2026-10-03T00:00:00Z" };
const incident = { number:7, state:"open", user:{login:"github-actions[bot]"}, body:`${INCIDENT_MARKER}\n<!-- flightforge-health-fingerprint:${fingerprint(degraded)} -->` };
const payload = { status:"ok", service:"flightforge-web", releaseId:"abcdef0123", supabaseConfigured:true, checks:{database:true,schema:true,privateStorage:true}, authentication:{status:"AVAILABLE"} };

describe("production monitor", () => {
  it("checks homepage and all dependencies without leaking bodies", async () => {
    const fetcher = vi.fn().mockImplementation(async (url:string) => url.endsWith("/api/health") ? Response.json(payload) : new Response("private content",{headers:{"content-type":"text/html"}}));
    expect(await probeProduction(healthy.origin, fetcher)).toEqual(healthy);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("reports real auth outage even when storage is healthy", async () => {
    const fetcher = vi.fn().mockImplementation(async (url:string) => url.endsWith("/api/health") ? Response.json({...payload,status:"degraded",authentication:{status:"UNAVAILABLE"}},{status:503}) : new Response("",{headers:{"content-type":"text/html"}}));
    expect((await probeProduction(healthy.origin,fetcher)).failures).toEqual(["authentication_unavailable","health_http_503","service_degraded"]);
  });
  it("rejects unconfigured authentication and missing checks", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({...payload,checks:{},supabaseConfigured:false,authentication:{status:"NOT_CONFIGURED"}}));
    expect((await probeProduction(healthy.origin,fetcher)).healthy).toBe(false);
  });
  it("does not print exception secrets", async () => {
    const report = await probeProduction(healthy.origin, vi.fn().mockRejectedValue(Error("private-key")));
    expect(report.failures).toEqual(["health_unreachable_or_invalid","homepage_unreachable"]);
    expect(JSON.stringify(report)).not.toContain("private-key");
  });
  it("rejects credential-bearing URLs", async () => {
    await expect(probeProduction("https://user:password@example.com")).rejects.toThrow("HTTPS origin");
  });
  it("opens one incident for a new outage", async () => {
    const github=api();
    expect(await reconcileIncident({...args,github})).toEqual({action:"opened",issueNumber:7});
    expect(github.rest.issues.create).toHaveBeenCalledOnce();
  });
  it("does not write or notify again for identical failures, even across releases", async () => {
    const github=api([incident]);
    expect(await reconcileIncident({...args,github,report:{...degraded,release:"newrelease"}})).toEqual({action:"unchanged",issueNumber:7});
    for (const method of [github.rest.issues.create,github.rest.issues.update,github.rest.issues.createComment]) expect(method).not.toHaveBeenCalled();
  });
  it("updates the current incident when failures change", async () => {
    const github=api([incident]);
    expect((await reconcileIncident({...args,github,report:{...degraded,failures:["database_unavailable"]}})).action).toBe("updated");
    expect(github.rest.issues.create).not.toHaveBeenCalled();
    expect(github.rest.issues.createComment).toHaveBeenCalledOnce();
  });
  it("closes incidents only after confirmed healthy probes", async () => {
    const github=api([incident]);
    expect((await reconcileIncident({...args,github,report:healthy})).action).toBe("resolved");
    expect(github.rest.issues.update).toHaveBeenCalledWith(expect.objectContaining({state:"closed",issue_number:7}));
  });
  it("starts a new incident for recurrence after recovery or manual closure", async () => {
    const github=api([{...incident,state:"closed"}]);
    expect((await reconcileIncident({...args,github})).action).toBe("opened");
  });
  it("ignores marker impersonation by other users or pull requests", async () => {
    const github=api([{...incident,user:{login:"someone"}},{...incident,pull_request:{}}]);
    expect((await reconcileIncident({...args,github})).action).toBe("opened");
  });
  it("fails loudly if incident reporting breaks", async () => {
    const github=api();github.rest.issues.create.mockRejectedValue(Error("GitHub denied write"));
    await expect(reconcileIncident({...args,github})).rejects.toThrow("GitHub denied write");
  });
  it("rechecks a transient failure and reports recovery without creating an incident", async () => {
    const github=api();
    const summary={addHeading:vi.fn().mockReturnThis(),addRaw:vi.fn().mockReturnThis(),write:vi.fn()};
    const core={warning:vi.fn(),summary};
    const probe=vi.fn().mockResolvedValueOnce(degraded).mockResolvedValueOnce(healthy);
    expect((await runMonitor({github,context,core,siteUrl:healthy.origin,probe})).action).toBe("healthy");
    expect(probe).toHaveBeenCalledTimes(2);
    expect(github.rest.issues.create).not.toHaveBeenCalled();
  });
  it.each([true,false])("confirms existing-incident recovery; second probe healthy = %s", async (secondHealthy) => {
    const github=api([incident]);
    const summary={addHeading:vi.fn().mockReturnThis(),addRaw:vi.fn().mockReturnThis(),write:vi.fn()};
    const core={warning:vi.fn(),summary};
    const probe=vi.fn().mockResolvedValueOnce(healthy).mockResolvedValueOnce(secondHealthy ? healthy : degraded);
    const result=await runMonitor({github,context,core,siteUrl:healthy.origin,probe});
    expect(result.action).toBe(secondHealthy ? "resolved" : "unchanged");
    expect(probe).toHaveBeenCalledTimes(2);
    if (!secondHealthy) {
      expect(github.rest.issues.update).not.toHaveBeenCalled();
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("PRODUCTION DEGRADED"));
    }
  });
});
