import { turnoarEmailLogoBase64 } from "./email-logo.js";

const colors = {
  accent: "#fd8606",
  accentSoft: "#fff4e8",
  border: "#dedde3",
  ink: "#201836",
  muted: "#67636f",
  page: "#f4f4f6",
  surface: "#ffffff"
};

type EmailTemplateInput = {
  eyebrow: string;
  title: string;
  intro: string;
  action?: { label: string; url: string };
  code?: string;
  note: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return replacements[character] ?? character;
  });
}

export function getTurnoarEmailFrom(configuredFrom: string) {
  const addressMatch = configuredFrom.match(/<([^>]+)>/);
  return addressMatch
    ? `Turnoar <${addressMatch[1]}>`
    : `Turnoar <${configuredFrom.trim()}>`;
}

export const turnoarEmailLogoAttachment = {
  content: turnoarEmailLogoBase64,
  content_id: "turnoar-logo",
  content_type: "image/png",
  filename: "turnoar-logo.png"
} as const;

export function renderTurnoarEmail(input: EmailTemplateInput) {
  const eyebrow = escapeHtml(input.eyebrow);
  const title = escapeHtml(input.title);
  const intro = escapeHtml(input.intro);
  const note = escapeHtml(input.note);

  const actionHtml = input.action
    ? `
      <tr>
        <td style="padding:24px 0 4px;">
          <a href="${escapeHtml(input.action.url)}" target="_blank" style="display:inline-block;border-radius:8px;background:${colors.ink};color:#ffffff;font-family:Arial,'Helvetica Neue',sans-serif;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;padding:12px 20px;">
            ${escapeHtml(input.action.label)}&nbsp;&nbsp;→
          </a>
        </td>
      </tr>`
    : "";

  const codeHtml = input.code
    ? `
      <tr>
        <td style="padding:24px 0 4px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td class="email-code" style="border:1px solid ${colors.border};border-left:3px solid ${colors.accent};border-radius:10px;background:#f8f8fa;padding:15px 20px;color:${colors.ink};font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;line-height:34px;letter-spacing:8px;white-space:nowrap;">
                ${escapeHtml(input.code)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${title}</title>
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      @media (prefers-color-scheme: dark) {
        body.email-body, .email-page { background-color:#0d0d0f !important; }
        .email-card { background-color:#171719 !important; border-color:#36363c !important; }
        .email-title { color:#f7f7f8 !important; }
        .email-copy { color:#c9c7cf !important; }
        .email-code { background-color:#101012 !important; border-color:#414148 !important; color:#ffffff !important; }
        .email-note { background-color:#382108 !important; border-color:#8a4a08 !important; color:#ffd7ad !important; }
        .email-security { border-color:#36363c !important; color:#aaa7b1 !important; }
        .email-footer { color:#8f8c96 !important; }
      }
      [data-ogsc] .email-page { background-color:#0d0d0f !important; }
      [data-ogsc] .email-card { background-color:#171719 !important; border-color:#36363c !important; }
      [data-ogsc] .email-title { color:#f7f7f8 !important; }
      [data-ogsc] .email-copy { color:#c9c7cf !important; }
      [data-ogsc] .email-code { background-color:#101012 !important; border-color:#414148 !important; color:#ffffff !important; }
      [data-ogsc] .email-note { background-color:#382108 !important; border-color:#8a4a08 !important; color:#ffd7ad !important; }
      [data-ogsc] .email-security { border-color:#36363c !important; color:#aaa7b1 !important; }
      [data-ogsc] .email-footer { color:#8f8c96 !important; }
    </style>
  </head>
  <body class="email-body" style="margin:0;padding:0;background:${colors.page};font-family:Arial,'Helvetica Neue',sans-serif;color:${colors.ink};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${intro}</div>
    <table class="email-page" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.page}" style="width:100%;background:${colors.page};">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="border-radius:16px 16px 0 0;background:${colors.ink};padding:20px 24px;">
                <img src="cid:turnoar-logo" width="148" alt="Turnoar" style="display:block;width:148px;height:auto;border:0;color:#ffffff;font-size:18px;font-weight:700;">
              </td>
            </tr>
            <tr>
              <td class="email-card" bgcolor="${colors.surface}" style="border:1px solid ${colors.border};border-top:0;border-radius:0 0 16px 16px;background:${colors.surface};padding:30px 24px 26px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="color:${colors.accent};font-size:11px;font-weight:700;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;">${eyebrow}</td>
                  </tr>
                  <tr>
                    <td class="email-title" style="padding-top:9px;color:${colors.ink};font-size:24px;font-weight:700;line-height:30px;letter-spacing:-0.3px;">${title}</td>
                  </tr>
                  <tr>
                    <td class="email-copy" style="padding-top:12px;color:${colors.muted};font-size:14px;line-height:22px;">${intro}</td>
                  </tr>
                  ${codeHtml}
                  ${actionHtml}
                  <tr>
                    <td style="padding-top:22px;">
                      <div class="email-note" style="border:1px solid #ffd3a3;border-radius:9px;background:${colors.accentSoft};padding:12px 14px;color:#6b4a29;font-size:12px;line-height:19px;">${note}</div>
                    </td>
                  </tr>
                  <tr>
                    <td class="email-security" style="padding-top:22px;border-top:1px solid ${colors.border};color:${colors.muted};font-size:11px;line-height:18px;">
                      Si no solicitaste este correo, podés ignorarlo de forma segura.<br>
                      Nunca compartas códigos ni contraseñas por email.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-footer" align="center" style="padding:18px 20px 0;color:#8b8892;font-size:11px;line-height:18px;">
                © ${new Date().getFullYear()} Turnoar · Gestión simple para tu negocio
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
