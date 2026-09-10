import {z} from "zod";
import {getD1Database} from "@/db/runtime";
import type {AuthenticatedUser} from "@/modules/auth/types";
import {getManagedEvent} from "@/modules/events/event-repository";
import {canCoordinateCourse} from "@/modules/events/coordinator-repository";
import {weeklyStarts} from "./calendar";
import {audit,safeCommunityText,ToolError,transactionGuard} from "@/modules/player-tools/server";
export const seriesSchema=z.object({id:z.uuid(),name:z.string().trim().min(3).max(100),description:z.string().trim().min(10).max(1000),templateId:z.uuid(),weeks:z.number().int().min(1).max(12)});
export async function createSeries(user:AuthenticatedUser,i:z.infer<typeof seriesSchema>) {
  const template=await getManagedEvent(user,i.templateId);
  if(!template||!await canCoordinateCourse(user,template.courseId))throw new ToolError("You need coordinator access for the template's course.",403);
  if(!template.courseId||template.status!=="PUBLISHED"||template.visibility!=="PUBLIC"||Date.parse(template.startsAt)<Date.now())throw new ToolError("Choose a future, public, published event at a course.");
  safeCommunityText(i.name);safeCommunityText(i.description);
  const db=getD1Database(),now=new Date().toISOString(),starts=weeklyStarts(template.startsAt,template.timeZone,i.weeks),duration=Date.parse(template.endsAt)-Date.parse(template.startsAt);
  const old=await db.prepare("SELECT administrator_user_id AS uid,rules_json AS rules FROM leagues WHERE id=?").bind(i.id).first<{uid:string;rules:string}>();
  if(old){if(old.uid!==user.id||old.rules!==JSON.stringify(i))throw new ToolError("This request already belongs to a different series.",409);return {id:i.id};}
  const linked=await db.prepare("SELECT id FROM league_events WHERE json_extract(configuration_json,'$.eventId')=?").bind(template.id).first();if(linked)throw new ToolError("This template already belongs to a league schedule.");
  const statements=[
    ...transactionGuard("EXISTS(SELECT 1 FROM events WHERE id=? AND version=? AND course_id=? AND visibility='PUBLIC' AND status='PUBLISHED' AND deleted_at IS NULL)",[template.id,template.version,template.courseId]),
    db.prepare("INSERT INTO league_event_links(event_id,league_id) VALUES(?,?)").bind(template.id,i.id),
    db.prepare("INSERT INTO leagues(id,administrator_user_id,name,slug,description,home_course_id,season_start,season_end,status,privacy,rules_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'ACTIVE','PUBLIC',?,?,?)").bind(i.id,user.id,i.name,"league-"+i.id,i.description,template.courseId,starts[0].slice(0,10),starts.at(-1)!.slice(0,10),JSON.stringify(i),now,now),
    db.prepare("INSERT INTO league_courses(id,league_id,course_id,status,accepted_at,created_at,updated_at) VALUES(?,?,?,'ACTIVE',?,?,?)").bind(crypto.randomUUID(),i.id,template.courseId,now,now,now),
  ];
  for(const [index,start] of starts.entries()){
    const eventId=index===0?template.id:crypto.randomUUID(),end=new Date(Date.parse(start)+duration).toISOString();
    if(index>0)statements.push(db.prepare(`INSERT INTO events(id,slug,organizer_user_id,organizer_email,organization_name,event_type,title,summary,description,course_id,layout_id,hole_count,time_zone,venue_name,address_line_1,city,region_code,country_code,starts_at,ends_at,registration_url,contact_email,capacity,entry_fee_cents,currency,format,divisions_json,accessibility_notes,status,visibility,published_at,idempotency_key,created_at,updated_at,version)
      SELECT ?,?,organizer_user_id,organizer_email,organization_name,'LEAGUE',?,summary,description,course_id,layout_id,hole_count,time_zone,venue_name,address_line_1,city,region_code,country_code,?,?,registration_url,contact_email,capacity,entry_fee_cents,currency,format,divisions_json,accessibility_notes,'PUBLISHED','PUBLIC',?,?,?,?,1 FROM events WHERE id=? AND status='PUBLISHED' AND deleted_at IS NULL`)
      .bind(eventId,"league-"+eventId,i.name+" · week "+(index+1),start,end,now,"league:"+i.id+":"+index,now,now,template.id));
    if(index>0)statements.push(db.prepare("INSERT INTO league_event_links(event_id,league_id) VALUES(?,?)").bind(eventId,i.id));
    statements.push(db.prepare("INSERT INTO league_events(id,league_id,course_id,layout_id,starts_at,status,configuration_json,created_at,updated_at) VALUES(?,?,?,?,?,'SCHEDULED',?,?,?)").bind(crypto.randomUUID(),i.id,template.courseId,template.layoutId,start,JSON.stringify({eventId}),now,now));
  }
  statements.push(audit(user.id,"league",i.id,"CREATE",{weeks:i.weeks,templateId:i.templateId}));
  await db.batch(statements);return {id:i.id};
}
export async function listSeries() {return(await getD1Database().prepare("SELECT id,name,description FROM leagues WHERE status='ACTIVE' AND privacy='PUBLIC' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100").all<{id:string;name:string;description:string}>()).results;}
export async function leagueDetail(uid:string,id:string) {
  const db=getD1Database(),league=await db.prepare("SELECT id,name,description,administrator_user_id=? AS manager FROM leagues WHERE id=? AND privacy='PUBLIC' AND deleted_at IS NULL").bind(uid,id).first<{id:string;name:string;description:string;manager:number}>();
  if(!league)throw new ToolError("League not found.",404);
  const events=(await db.prepare(`SELECT e.id,e.slug,e.title,e.venue_name AS venue,e.starts_at AS startsAt,e.ends_at AS endsAt,e.time_zone AS timeZone,e.status,e.capacity,e.version,e.registration_url AS registrationUrl,e.entry_fee_cents AS entryFeeCents,
    r.status AS rsvp,r.attended,(SELECT COUNT(*) FROM companion_rsvps x WHERE x.event_id=e.id AND x.status='GOING') AS going,
    (SELECT COUNT(*) FROM companion_rsvps x WHERE x.event_id=e.id AND x.status='WAITLIST') AS waiting
    FROM league_events le JOIN events e ON e.id=json_extract(le.configuration_json,'$.eventId') LEFT JOIN companion_rsvps r ON r.event_id=e.id AND r.user_id=?
    WHERE le.league_id=? AND e.deleted_at IS NULL AND e.visibility='PUBLIC' AND e.status IN ('PUBLISHED','CANCELLED') ORDER BY e.starts_at`).bind(uid,id).all<{id:string;slug:string;title:string;venue:string;startsAt:string;endsAt:string;timeZone:string;status:string;capacity:number|null;version:number;registrationUrl:string|null;entryFeeCents:number;rsvp:string|null;attended:number|null;going:number;waiting:number}>()).results;
  const roster=league.manager?(await db.prepare(`SELECT r.id,r.event_id AS eventId,u.display_name AS name,r.status,r.attended FROM companion_rsvps r JOIN users u ON u.id=r.user_id
    JOIN league_events le ON json_extract(le.configuration_json,'$.eventId')=r.event_id WHERE le.league_id=? AND r.status!='CANCELLED' ORDER BY r.created_at LIMIT 500`).bind(id).all<{id:string;eventId:string;name:string;status:string;attended:number}>()).results:[];
  return {...league,events,roster};
}
export async function rsvp(uid:string,eventId:string,going:boolean) {
  const db=getD1Database();
  const event=await db.prepare(`SELECT e.id FROM events e JOIN league_events le ON json_extract(le.configuration_json,'$.eventId')=e.id
    WHERE e.id=? AND e.status='PUBLISHED' AND e.visibility='PUBLIC' AND e.deleted_at IS NULL AND datetime(e.starts_at)>datetime('now')`).bind(eventId).first();
  if(!event&&going)throw new ToolError("RSVP is closed for this event.",409);
  const now=new Date().toISOString();
  if(going)await db.batch([promoteWaitlist(db,eventId,now),db.prepare(`INSERT INTO companion_rsvps(id,event_id,user_id,status,created_at,updated_at)
    SELECT ?,e.id,?,CASE WHEN NOT EXISTS(SELECT 1 FROM companion_rsvps waiting WHERE waiting.event_id=e.id AND waiting.status='WAITLIST') AND (e.capacity IS NULL OR (SELECT COUNT(*) FROM companion_rsvps r WHERE r.event_id=e.id AND r.status='GOING')<e.capacity) THEN 'GOING' ELSE 'WAITLIST' END,?,?
    FROM events e WHERE e.id=? AND e.status='PUBLISHED' AND datetime(e.starts_at)>datetime('now')
    ON CONFLICT(event_id,user_id) DO UPDATE SET status=CASE WHEN companion_rsvps.status IN ('GOING','WAITLIST') THEN companion_rsvps.status ELSE excluded.status END,
    created_at=CASE WHEN companion_rsvps.status='CANCELLED' THEN excluded.created_at ELSE companion_rsvps.created_at END,updated_at=excluded.updated_at`).bind(crypto.randomUUID(),uid,now,now,eventId)]);
  else await db.batch([
    db.prepare("UPDATE companion_rsvps SET status='CANCELLED',attended=0,updated_at=? WHERE event_id=? AND user_id=? AND status IN ('GOING','WAITLIST')").bind(now,eventId,uid),
    promoteWaitlist(db,eventId,now),
  ]);
  return {rsvp:await db.prepare("SELECT status FROM companion_rsvps WHERE event_id=? AND user_id=?").bind(eventId,uid).first()};
}
export async function attendance(uid:string,id:string,attended:boolean) {
  const db=getD1Database(),allowed=await db.prepare(`SELECT r.id FROM companion_rsvps r JOIN league_events le ON json_extract(le.configuration_json,'$.eventId')=r.event_id
    JOIN leagues l ON l.id=le.league_id WHERE r.id=? AND l.administrator_user_id=? AND r.status='GOING'`).bind(id,uid).first();
  if(!allowed)throw new ToolError("Only this league's administrator can mark attendance for confirmed RSVPs.",403);
  await db.batch([db.prepare("UPDATE companion_rsvps SET attended=?,updated_at=? WHERE id=? AND status='GOING'").bind(Number(attended),new Date().toISOString(),id),audit(uid,"league_rsvp",id,"ATTENDANCE",{attended})]);return {updated:true};
}
function promoteWaitlist(db:D1Database,eventId:string,now:string){return db.prepare(`UPDATE companion_rsvps SET status='GOING',updated_at=? WHERE id IN (
 SELECT r.id FROM companion_rsvps r JOIN events e ON e.id=r.event_id WHERE r.event_id=? AND r.status='WAITLIST' AND e.status='PUBLISHED' AND e.visibility='PUBLIC' AND e.deleted_at IS NULL AND datetime(e.starts_at)>datetime('now')
 ORDER BY r.created_at,r.id LIMIT (SELECT MAX(0,COALESCE(e.capacity,5000)-(SELECT COUNT(*) FROM companion_rsvps n WHERE n.event_id=e.id AND n.status='GOING')) FROM events e WHERE e.id=?))`).bind(now,eventId,eventId);}
