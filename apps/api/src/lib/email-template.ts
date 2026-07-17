const colors = {
  accent: "#fd8606",
  border: "rgba(32, 24, 54, 0.14)",
  ink: "#201836",
  muted: "#64625a",
  page: "#f0ead9",
  surface: "#fffaf4"
};

type EmailTemplateInput = {
  eyebrow: string;
  title: string;
  intro: string;
  action?: {
    label: string;
    url: string;
  };
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

export function renderTurnosiEmail(input: EmailTemplateInput) {
  const eyebrow = escapeHtml(input.eyebrow);
  const title = escapeHtml(input.title);
  const intro = escapeHtml(input.intro);
  const note = escapeHtml(input.note);

  const actionHtml = input.action
    ? `
      <tr>
        <td style="padding: 22px 0 8px;">
          <a href="${escapeHtml(input.action.url)}" style="display:inline-block;border-radius:10px;background:${colors.ink};color:${colors.surface};font-size:14px;font-weight:700;text-decoration:none;padding:13px 18px;">
            ${escapeHtml(input.action.label)}
          </a>
        </td>
      </tr>`
    : "";

  const codeHtml = input.code
    ? `
      <tr>
        <td style="padding: 18px 0 8px;">
          <div style="display:inline-block;border:1px solid ${colors.border};border-radius:14px;background:#ffffff;padding:14px 18px;color:${colors.ink};font-family:'Courier New',monospace;font-size:30px;font-weight:800;letter-spacing:8px;">
            ${escapeHtml(input.code)}
          </div>
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0;background:${colors.page};font-family:Inter,Segoe UI,Arial,sans-serif;color:${colors.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${colors.page};padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding:22px 24px;border-radius:18px 18px 0 0;background:${colors.ink};">
                <div style="font-size:26px;font-weight:800;letter-spacing:-0.03em;color:${colors.surface};">
                  Turno<span style="color:${colors.accent};">Si</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid ${colors.border};border-top:0;border-radius:0 0 18px 18px;background:${colors.surface};padding:28px 24px 24px;box-shadow:0 22px 60px rgba(32,24,54,0.12);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="color:${colors.accent};font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">
                      ${eyebrow}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:10px;font-size:26px;line-height:1.25;font-weight:800;color:${colors.ink};">
                      ${title}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:12px;font-size:15px;line-height:1.7;color:${colors.muted};">
                      ${intro}
                    </td>
                  </tr>
                  ${codeHtml}
                  ${actionHtml}
                  <tr>
                    <td style="padding-top:18px;">
                      <div style="border-radius:12px;background:rgba(253,134,6,0.09);border:1px solid rgba(253,134,6,0.22);padding:13px 14px;color:${colors.muted};font-size:13px;line-height:1.6;">
                        ${note}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:22px;color:${colors.muted};font-size:12px;line-height:1.6;">
                      Si no solicitaste este correo, podés ignorarlo.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
