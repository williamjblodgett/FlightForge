// @vitest-environment jsdom
import {act,cleanup,renderHook,waitFor} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {useToolResource} from "@/components/player-tools/useToolResource";
import {toolRequest,ToolRequestError} from "@/modules/player-tools/client";

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("recoverable private tool reads",()=>{
  it("does not call an unread collection empty; retries a failed read",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({error:{message:"Temporarily unavailable"}},{status:503})).mockResolvedValueOnce(Response.json({stamps:[]}));
    vi.stubGlobal("fetch",fetcher);
    const {result}=renderHook(()=>useToolResource<{stamps:unknown[]}>("/api/passport"));
    expect(result.current.ready).toBe(false);
    expect(result.current.data).toBeNull();
    await waitFor(()=>expect(result.current.errorStatus).toBe(503));
    await act(async()=>{await result.current.refresh();});
    expect(result.current.ready).toBe(true);
    expect(result.current.data?.stamps).toEqual([]);
  });
  it("retains stale information for a temporary failure, then removes it on access denial",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({stamps:["private"]})).mockResolvedValueOnce(Response.json({},{status:503})).mockResolvedValueOnce(Response.json({},{status:401}));
    vi.stubGlobal("fetch",fetcher);
    const {result}=renderHook(()=>useToolResource<{stamps:string[]}>("/api/passport"));
    await waitFor(()=>expect(result.current.ready).toBe(true));
    await act(async()=>{await result.current.refresh();});
    expect(result.current.data?.stamps).toEqual(["private"]);
    expect(result.current.ready).toBe(false);
    await act(async()=>{await result.current.refresh();});
    expect(result.current.data).toBeNull();
    expect(result.current.errorStatus).toBe(401);
  });
  it("ignores an obsolete response even if the transport ignores abort",async()=>{
    let finishOld!:(response:Response)=>void;
    const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{finishOld=resolve;})).mockResolvedValueOnce(Response.json({stamps:["new"]}));
    vi.stubGlobal("fetch",fetcher);
    const {result}=renderHook(()=>useToolResource<{stamps:string[]}>("/api/passport"));
    await act(async()=>{await result.current.refresh();});
    await act(async()=>{finishOld(Response.json({stamps:["old"]}));});
    expect(result.current.data?.stamps).toEqual(["new"]);
    expect(result.current.error).toBe("");
  });
  it("aborts in-flight reads on unmount",()=>{
    const fetcher=vi.fn().mockImplementation(()=>new Promise(()=>{}));
    vi.stubGlobal("fetch",fetcher);
    const {unmount}=renderHook(()=>useToolResource("/api/passport"));
    const signal=fetcher.mock.calls[0][1].signal as AbortSignal;
    unmount();expect(signal.aborted).toBe(true);
  });
  it("clears private records when a mutation reports an expired session",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({stamps:["private"]})));
    const {result}=renderHook(()=>useToolResource("/api/passport"));
    await waitFor(()=>expect(result.current.ready).toBe(true));
    act(()=>{result.current.handleAuthFailure(new ToolRequestError("Sign in again",401));});
    expect(result.current.data).toBeNull();expect(result.current.ready).toBe(false);
    expect(result.current.errorStatus).toBe(401);
  });
  it("does not turn a network or non-JSON failure into a claim that a write did not happen",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(new Response("<html>Unavailable</html>",{status:503})));
    await expect(toolRequest("/api/passport","PUT",{})).rejects.toThrow(/refresh before submitting/i);
    await expect(toolRequest("/api/passport")).rejects.toBeInstanceOf(ToolRequestError);
  });
});
