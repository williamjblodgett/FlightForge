type ProviderUser={id:string;email?:string;email_confirmed_at?:string;identities?:Array<{provider:string}>;user_metadata:Record<string,unknown>};

/** Only getUser()'s server-validated identity may be passed here, never request JSON. */
export function googleIdentityFromUser(user:ProviderUser|null){
  if(!user?.email||!user.email_confirmed_at||!user.identities?.some(identity=>identity.provider==="google"))return null;
  const metadata=user.user_metadata;
  const name=typeof metadata.display_name==="string"?metadata.display_name:typeof metadata.full_name==="string"?metadata.full_name:"Player";
  return {authUserId:user.id,email:user.email.toLowerCase(),displayName:name.trim().slice(0,60)||"Player",emailVerified:true as const};
}
