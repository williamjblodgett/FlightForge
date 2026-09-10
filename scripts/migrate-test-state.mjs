import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { unstable_splitSqlQuery } from "wrangler";
if(process.env.FLIGHTFORGE_TEST_ISOLATED!=="1"||!process.env.FLIGHTFORGE_TEST_STATE)throw new Error("This migrator requires an isolated test workspace.");
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:"",resourcePersistencePath:join(process.env.FLIGHTFORGE_TEST_STATE,"v3"),d1Databases:{DB:"00000000-0000-4000-8000-000000000000"},telemetry:{enabled:false}}));
try{
  const db=await mf.getD1Database("DB"),directory=resolve("drizzle");
  const files=(await readdir(directory)).filter(name=>/^\d{4}_.+\.sql$/u.test(name)).sort();
  for(const file of files){const sql=(await readFile(join(directory,file),"utf8")).replaceAll("--> statement-breakpoint","");const statements=unstable_splitSqlQuery(sql);if(statements.length)await db.batch(statements.map(statement=>db.prepare(statement)));}
  console.log(`Applied ${files.length} migrations to isolated local D1.`);
}finally{await mf.dispose();}
