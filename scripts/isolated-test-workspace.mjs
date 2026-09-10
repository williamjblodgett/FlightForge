import { cpSync, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";

export function isolatedTestWorkspace(extra = {}) {
  const source=resolve(process.cwd());
  const cwd=mkdtempSync(join(tmpdir(),"ff-test-"));
  const excluded=new Set(["node_modules",".git",".wrangler",".cloudflare",".next",".vinext",".codex",".agents","dist","pages-dist","out","coverage","test-results","playwright-report","outputs","work",".tmp",".npmrc",".yarnrc",".yarnrc.yml","wrangler.json","wrangler.jsonc","wrangler.toml"]);
  // Copy current source, never real provider credentials or previous runtime state.
  cpSync(source,cwd,{recursive:true,filter(path){const name=basename(path);return !relative(source,path).split(sep).some(part=>excluded.has(part))&&!name.startsWith(".env")&&!name.startsWith(".dev.vars")&&!/\.(pem|key)$/iu.test(name);}});
  symlinkSync(join(source,"node_modules"),join(cwd,"node_modules"),process.platform==="win32"?"junction":"dir");
  const systemKeys=/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|HOME|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|LANG|LC_ALL|TERM|PLAYWRIGHT_BROWSERS_PATH)$/iu;
  const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>systemKeys.test(key))),...extra,
    CI:"1",FLIGHTFORGE_TEST_ISOLATED:"1",FLIGHTFORGE_TEST_STATE:join(cwd,".test-state"),EMAIL_DELIVERY_MODE:"test",AI_PROVIDER:"mock",OPENAI_API_KEY:"",AI_API_KEY:"",NEXT_PUBLIC_SUPABASE_URL:"",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"",SUPABASE_SERVICE_ROLE_KEY:"",DATABASE_URL:"",GOOGLE_MAPS_API_KEY:"",NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:"",EMAIL_VERIFICATION_WEBHOOK_URL:"",EMAIL_VERIFICATION_WEBHOOK_SECRET:"",NEXT_PUBLIC_SUPPORT_EMAIL:"support@example.test",NEXT_PUBLIC_PRIVACY_EMAIL:"privacy@example.test",LEGAL_TERMS_VERSION:"test-v1",LEGAL_PRIVACY_VERSION:"test-v1",CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:"false",CLOUDFLARE_INCLUDE_PROCESS_ENV:"false",CLOUDFLARE_VITE_FORCE_LOCAL:"true",WRANGLER_SEND_METRICS:"false",WRANGLER_DISABLE_UPDATE_CHECK:"true",WRANGLER_WRITE_LOGS:"false",WRANGLER_LOG_PATH:join(cwd,".test-logs"),MINIFLARE_REGISTRY_PATH:join(cwd,".test-registry")};
  console.log(`Isolated test workspace: ${cwd}`);
  // Retained for debugging; never recursively delete through the dependency junction.
  return {cwd,env};
}
