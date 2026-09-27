import Link from "next/link";
import type {ReactNode} from "react";
import type {AuthenticatedUser} from "@/modules/auth/types";
import {isPlayerReady} from "@/modules/auth/player-readiness";
import {authStepPath,nextAuthDestination} from "@/modules/auth/continuation";
export function PlayerToolGate({user,returnTo,children}:{user:AuthenticatedUser|null;returnTo:string;children:ReactNode}) {
  const href=!user?authStepPath("/sign-in",returnTo):!user.emailVerified?authStepPath("/verify-email",returnTo):nextAuthDestination(user,returnTo);
  if(isPlayerReady(user))return children;
  return <section className="feature-card account-gate"><h2>{user?"Finish your player setup":"Sign in to continue"}</h2><p>{user?"Verify your email and finish setting up your profile to use this tool.":"Your player account keeps your information private and available across devices."}</p><div className="feature-actions"><Link className="button button-primary" href={href}>{user?"Continue setup":"Sign in"}</Link>{!user?<Link className="button button-secondary" href={authStepPath("/sign-up",returnTo)}>Create free account</Link>:null}</div></section>;
}
