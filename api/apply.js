// POST /api/apply — receives a job application and emails it (with resume
// attached) via the Resend API. Also sends the candidate a confirmation email.
//
// Required Vercel env var:
//   RESEND_API_KEY  — your Resend API key (re_...)
// Optional:
//   APPLICATIONS_TO — where applications are delivered (default below)
//   MAIL_FROM       — verified sender (default onboarding@resend.dev, which
//                     works without a verified domain but can only deliver
//                     to the Resend account owner's email)

const APPLICATIONS_TO = process.env.APPLICATIONS_TO || 'ncl9100@nyu.edu';
const MAIL_FROM = process.env.MAIL_FROM || 'Pure AI Studio <onboarding@resend.dev>';

// 3 MB binary cap — keeps the base64 JSON body safely under Vercel's 4.5 MB limit.
const MAX_RESUME_BYTES = 3 * 1024 * 1024;

const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendEmail(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
  return res.json();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  const {
    name, email, phone, position, linkedin, portfolio, coverLetter,
    resumeName, resumeContent, // resumeContent = base64 (no data: prefix)
  } = req.body || {};

  // ── Validation ────────────────────────────────────────────────────────────
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required.' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!position) return res.status(400).json({ error: 'Please choose a position.' });
  if (!resumeName || !resumeContent) return res.status(400).json({ error: 'Please attach your resume.' });
  if (!ALLOWED_EXTENSIONS.test(resumeName)) {
    return res.status(400).json({ error: 'Resume must be a PDF, DOC, or DOCX file.' });
  }
  const resumeBytes = Buffer.byteLength(resumeContent, 'base64');
  if (resumeBytes > MAX_RESUME_BYTES) {
    return res.status(400).json({ error: 'Resume must be 3 MB or smaller.' });
  }

  const row = (label, value) => value
    ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0">${esc(value)}</td></tr>`
    : '';

  // ── 1) Application email to Pure AI Studio (with resume attached) ────────
  try {
    await sendEmail({
      from: MAIL_FROM,
      to: [APPLICATIONS_TO],
      reply_to: email,
      subject: `Application — ${position} — ${name}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px">
          <h2 style="color:#111827">New job application</h2>
          <table style="font-size:14px;color:#111827;border-collapse:collapse">
            ${row('Name', name)}
            ${row('Email', email)}
            ${row('Phone', phone)}
            ${row('Position', position)}
            ${row('LinkedIn', linkedin)}
            ${row('Portfolio', portfolio)}
            ${row('Resume', resumeName)}
          </table>
          ${coverLetter ? `
            <h3 style="color:#111827;margin-top:20px">Cover letter</h3>
            <p style="font-size:14px;color:#374151;white-space:pre-wrap">${esc(coverLetter)}</p>` : ''}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px">Sent from the Pure AI Studio careers page.</p>
        </div>`,
      attachments: [{ filename: resumeName, content: resumeContent }],
    });
  } catch (err) {
    console.error('Application email failed:', err.message);
    return res.status(502).json({ error: 'We could not submit your application. Please try again or email us directly.' });
  }

  // ── 2) Confirmation email to the candidate (best-effort) ─────────────────
  // Note: until a domain is verified in Resend, delivery is restricted to the
  // account owner's email — this call may fail for other recipients. That's
  // fine: the application itself already went through.
  try {
    await sendEmail({
      from: MAIL_FROM,
      to: [email],
      subject: `We received your application — ${position}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px">
          <h2 style="color:#111827">Thanks for applying, ${esc(name)}!</h2>
          <p style="font-size:14px;color:#374151">
            We've received your application for <strong>${esc(position)}</strong> at Pure AI Studio,
            along with your resume (<em>${esc(resumeName)}</em>).
          </p>
          <p style="font-size:14px;color:#374151">
            We read every application and will get back to you if there's a fit.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Pure AI Studio</p>
        </div>`,
    });
  } catch (err) {
    console.warn('Candidate confirmation email failed (non-fatal):', err.message);
  }

  return res.status(200).json({ ok: true });
};
