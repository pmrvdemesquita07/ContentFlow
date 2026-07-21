import { getResend, reportsFromEmail } from "@/lib/email";
import { getPublicReportData } from "@/lib/reports";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function eur(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "EUR" });
}

export async function sendReportEmail({ to, reportId }: { to: string; reportId: string }) {
  const data = await getPublicReportData(reportId);
  if (!data) return { error: "Report not found or revoked." };

  const reportUrl = `${siteUrl()}/reports/${reportId}`;
  const roiLine = data.roi?.costPerInteraction
    ? `<p>Custo por interação: <strong>${eur(data.roi.costPerInteraction)}</strong></p>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px;">${data.campaignName}</h1>
      <p style="color: #666;">Relatório de ${data.workspaceName}</p>
      <table style="width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0;">Interações</td>
          <td style="text-align: right; font-weight: bold;">${data.totals.interactions.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Alcance</td>
          <td style="text-align: right; font-weight: bold;">${data.totals.reach.toLocaleString()}</td>
        </tr>
      </table>
      ${roiLine}
      <p style="margin-top: 24px;">
        <a href="${reportUrl}" style="background: #a021d8; color: white; padding: 10px 20px; border-radius: 999px; text-decoration: none;">
          Ver relatório completo
        </a>
      </p>
    </div>
  `;

  await getResend().emails.send({
    from: reportsFromEmail(),
    to,
    subject: `Relatório: ${data.campaignName}`,
    html,
  });

  return { error: null };
}
