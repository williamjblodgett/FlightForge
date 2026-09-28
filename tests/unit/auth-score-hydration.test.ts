import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {CorrectionForm} from "@/app/rounds/[id]/CorrectionForm";
import {GoogleSignInButton} from "@/components/auth/GoogleSignInButton";

describe("pre-hydration submission protection",()=>{
 it("disables score correction until its mutation handler is ready",()=>{
  const html=renderToStaticMarkup(createElement(CorrectionForm,{id:"round",version:1,holeCount:18}));
  expect(html).toMatch(/<fieldset[^>]*disabled=""/u);
  expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/u);
 });
 it("disables Google initiation until its POST handler is ready",()=>{
  const html=renderToStaticMarkup(createElement(GoogleSignInButton,{returnTo:"/bag"}));
  expect(html).toMatch(/<button[^>]*disabled=""/u);
 });
});
