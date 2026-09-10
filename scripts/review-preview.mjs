import {spawn,spawnSync} from "node:child_process";
import {isolatedTestWorkspace} from "./isolated-test-workspace.mjs";
const {cwd,env}=isolatedTestWorkspace();
const npm=process.env.npm_execpath;if(!npm)throw new Error("Run through npm.");
for(const args of [[npm,"run","build"],["scripts/migrate-test-state.mjs"]]){
 const result=spawnSync(process.execPath,args,{cwd,env,stdio:"inherit",windowsHide:true});if(result.status!==0)process.exit(result.status??1);
}
const child=spawn(process.execPath,["node_modules/vite/bin/vite.js","preview","--host","127.0.0.1","--port","3100","--strictPort"],{cwd,env,stdio:"inherit",windowsHide:true});
child.on("exit",code=>process.exit(code??0));
process.on("SIGINT",()=>child.kill());process.on("SIGTERM",()=>child.kill());
