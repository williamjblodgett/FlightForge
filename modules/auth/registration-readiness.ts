import { isPublicRegistrationReady } from "@/config/public-launch";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isEmailVerificationDeliveryConfigured } from "@/modules/notifications/email-verification";
export function registrationUsesHostedAuth():boolean{return process.env.EMAIL_DELIVERY_MODE!=="test"&&isSupabaseConfigured();}
export function isRegistrationReady():boolean {
  try{return isPublicRegistrationReady()&&(registrationUsesHostedAuth()||isEmailVerificationDeliveryConfigured());}catch{return false;}
}
