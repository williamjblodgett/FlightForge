import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

type Value = string | number | null | Uint8Array;
export function migratedDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  const directory = new URL("../../drizzle/",import.meta.url);
  for (const file of readdirSync(directory).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    db.exec(readFileSync(new URL(file,directory),"utf8").replaceAll("--> statement-breakpoint",""));
  }
  return db;
}

export function d1Adapter(db: DatabaseSync, afterFirst?: (sql: string) => void): D1Database {
  class Statement {
    constructor(readonly sql: string, readonly values: Value[] = []) {}
    bind(...values: Value[]) { return new Statement(this.sql,values); }
    execute() {
      const statement = db.prepare(this.sql);
      if (statement.columns().length) return { success:true,results:statement.all(...this.values),meta:{changes:0} };
      return { success:true,results:[],meta:{changes:Number(statement.run(...this.values).changes)} };
    }
    async first<T>() { const row = db.prepare(this.sql).get(...this.values) ?? null; afterFirst?.(this.sql); return row as T|null; }
    async all<T>() { const result=this.execute(); return {...result,results:result.results as T[]}; }
    async run() { return this.execute(); }
  }
  return {prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]) {
    db.exec("BEGIN");
    try { const result=statements.map(statement=>statement.execute()); db.exec("COMMIT"); return result; }
    catch(error) { db.exec("ROLLBACK"); throw error; }
  }} as unknown as D1Database;
}
