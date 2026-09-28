// @vitest-environment jsdom
import {createElement} from "react";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {GoogleSignInButton} from "@/components/auth/GoogleSignInButton";

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("Google sign-in control",()=>{
 it("preserves the destination and displays a recoverable provider failure",async()=>{
  const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:"Google is temporarily unavailable."}}),{status:503}));vi.stubGlobal("fetch",request);
  render(createElement(GoogleSignInButton,{returnTo:"/bag?hole=7#caddie-chat"}));
  const button=screen.getByRole("button",{name:"Continue with Google"});
  await waitFor(()=>expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toBe("Google is temporarily unavailable.");
  expect(request).toHaveBeenCalledWith("/api/auth/google",expect.objectContaining({method:"POST",body:JSON.stringify({returnTo:"/bag?hole=7#caddie-chat"})}));
  expect((screen.getByRole("button",{name:"Continue with Google"}) as HTMLButtonElement).disabled).toBe(false);
 });
});
