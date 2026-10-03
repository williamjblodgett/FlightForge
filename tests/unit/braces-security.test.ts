import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
type Ast = { type:string; value?:string; nodes?:Ast[] };
type Options = { maxDepth?:number; expand?:boolean; rangeLimit?:number };
type Operation = (input:string|Ast, options?:Options)=>unknown;
const braces = require("braces") as Operation & Record<"parse"|"compile"|"expand"|"stringify",Operation>;
const nested=(open:string,close:string,count=101)=>open.repeat(count)+"a,b"+close.repeat(count);

describe("braces depth-limit security backport",()=>{
  it("is the exact override used by transitive build consumers",()=>{
    const path=realpathSync(require.resolve("braces"));
    expect(path.replaceAll("\\","/")).toContain("/vendor/braces/index.js");
    const micromatchRequire=createRequire(require.resolve("micromatch"));
    expect(realpathSync(micromatchRequire.resolve("braces"))).toBe(path);
  });
  it.each(["parse","compile","expand","stringify"] as const)("rejects excessive strings via %s",method=>{
    for(const pattern of [nested("{","}"),nested("(",")"),nested("({","})",51),"{".repeat(101),"{1.."+nested("{","}")+",z}"]) {
      expect(()=>braces[method](pattern)).toThrow(/exceeds max depth/u);
    }
  });
  it.each([Infinity,NaN,10000])("cannot bypass the cap with maxDepth=%s",maxDepth=>{
    expect(()=>braces.compile(nested("{","}"),{maxDepth})).toThrow(/exceeds max depth/u);
  });
  it.each(["compile","expand","stringify"] as const)("guards caller ASTs through public and internal %s",method=>{
    let node:Ast={type:"text",value:"x"};
    for(let i=0;i<101;i++)node={type:"brace",nodes:[node]};
    const ast={type:"root",nodes:[node]};
    expect(()=>braces[method](ast)).toThrow(/exceeds max depth/u);
    const internal=require(`../../vendor/braces/lib/${method}.js`) as Operation;
    expect(()=>internal(ast)).toThrow(/exceeds max depth/u);
    expect(()=>internal(ast,{maxDepth:10000})).toThrow(/exceeds max depth/u);
  });
  it("retains common glob, range, escaping and bounded nesting behavior",()=>{
    expect(braces("src/**/*.{ts,tsx}")).toEqual(["src/**/*.(ts|tsx)"]);
    expect(braces.expand("a/{b,c}/{1..3}")).toEqual(["a/b/1","a/b/2","a/b/3","a/c/1","a/c/2","a/c/3"]);
    expect(braces.stringify(braces.parse("{a,b}") as Ast)).toBe("{a,b}");
    expect(()=>braces.parse("\\{".repeat(101))).not.toThrow();
    expect(()=>braces.compile(nested("{","}",100))).not.toThrow();
    expect(()=>braces.expand(nested("{","}",100))).not.toThrow();
    expect(()=>braces.stringify(nested("{","}",100))).not.toThrow();
    expect(()=>braces.parse("{{a,b},c}",{maxDepth:1})).toThrow(/exceeds max depth/u);
  });
});
