import { Resend } from "resend";

let resendClient: Resend | null = null;

/// Lazily constructed so importing this module never throws when
/// RESEND_API_KEY isn't set yet (e.g. during `next build`) - the error only
/// surfaces if the report-email cron actually runs without it.
export function getResend(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export function reportsFromEmail(): string {
  return process.env.REPORTS_FROM_EMAIL ?? "reports@socialflow.app";
}
