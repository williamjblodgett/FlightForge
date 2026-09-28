type ProviderError = {code?:string;name?:string;status?:number};
export function recoveryResponseStatus(error: ProviderError | null): 200 | 429 | 503 {
  if (!error) return 200;
  // Recipient-specific outcomes must not reveal whether the email is registered.
  if (["user_not_found","email_not_confirmed","user_banned","user_sso_managed","over_email_send_rate_limit"].includes(error.code ?? "")) return 200;
  if (error.code === "over_request_rate_limit") return 429;
  return 503;
}
