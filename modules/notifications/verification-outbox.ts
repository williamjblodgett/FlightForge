import {randomToken,sha256Text} from "@/modules/auth/password";
import {authReturnPath} from "@/modules/auth/continuation";
import {sendEmailVerification,type VerificationDeliveryEnvironment} from "./email-verification";

export function verificationJobStatement(db:D1Database,userId:string,origin:string,returnTo:string){
  const now=new Date().toISOString(),due=new Date(Date.now()+60_000).toISOString();
  return db.prepare(`INSERT INTO verification_delivery_jobs(id,user_id,origin,return_to,status,attempts,next_attempt_at,created_at,updated_at)
    VALUES(?,?,?,?,'PENDING',0,?,?,?) ON CONFLICT(user_id) DO UPDATE SET origin=excluded.origin,return_to=excluded.return_to,
    status='PENDING',attempts=0,next_attempt_at=excluded.next_attempt_at,lease_token=NULL,lease_expires_at=NULL,updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(),userId,new URL(origin).origin,authReturnPath(returnTo),due,now,now);
}

export async function acknowledgeVerificationDelivery(db:D1Database,userId:string){
  await db.prepare("UPDATE verification_delivery_jobs SET status='DELIVERED',updated_at=? WHERE user_id=? AND status='PENDING'").bind(new Date().toISOString(),userId).run();
}

export async function drainVerificationOutbox(db:D1Database,env:VerificationDeliveryEnvironment,limit=5){
  const now=new Date().toISOString();
  const jobs=await db.prepare(`SELECT j.id,j.user_id AS userId,j.origin,j.return_to AS returnTo,j.attempts,u.email,u.display_name AS displayName
    FROM verification_delivery_jobs j JOIN users u ON u.id=j.user_id
    WHERE j.attempts<6 AND ((j.status='PENDING' AND j.next_attempt_at<=?) OR (j.status='SENDING' AND j.lease_expires_at<=?))
    ORDER BY j.next_attempt_at LIMIT ?`).bind(now,now,Math.min(10,Math.max(1,limit))).all<{id:string;userId:string;origin:string;returnTo:string;attempts:number;email:string;displayName:string}>();
  let delivered=0,failed=0;
  for(const job of jobs.results){
    const lease=crypto.randomUUID();
    const claimed=await db.prepare(`UPDATE verification_delivery_jobs SET status='SENDING',lease_token=?,lease_expires_at=?,attempts=attempts+1,updated_at=?
      WHERE id=? AND attempts=? AND ((status='PENDING' AND next_attempt_at<=?) OR (status='SENDING' AND lease_expires_at<=?))`)
      .bind(lease,new Date(Date.now()+120_000).toISOString(),now,job.id,job.attempts,now,now).run();
    if(!claimed.meta.changes)continue;
    const pending=await db.prepare("SELECT id FROM users WHERE id=? AND status='PENDING_EMAIL_VERIFICATION' AND email_verified_at IS NULL AND deleted_at IS NULL").bind(job.userId).first();
    if(!pending){await db.prepare("UPDATE verification_delivery_jobs SET status='CANCELLED',lease_token=NULL,lease_expires_at=NULL,updated_at=? WHERE id=? AND lease_token=?").bind(now,job.id,lease).run();continue;}
    try{
      const token=randomToken(32),hash=await sha256Text(token);
      await db.prepare("INSERT INTO email_verification_tokens(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),job.userId,hash,new Date(Date.now()+30*60_000).toISOString(),now).run();
      await sendEmailVerification({...job,token},env);
      await db.prepare("UPDATE verification_delivery_jobs SET status='DELIVERED',lease_token=NULL,lease_expires_at=NULL,updated_at=? WHERE id=? AND lease_token=?").bind(new Date().toISOString(),job.id,lease).run();delivered++;
    }catch{
      const next=new Date(Date.now()+Math.min(60*60_000,60_000*2**(job.attempts+1))).toISOString();
      await db.prepare("UPDATE verification_delivery_jobs SET status=?,next_attempt_at=?,lease_token=NULL,lease_expires_at=NULL,updated_at=? WHERE id=? AND lease_token=?").bind(job.attempts+1>=6?"FAILED":"PENDING",next,new Date().toISOString(),job.id,lease).run();failed++;
    }
  }
  return {delivered,failed};
}
