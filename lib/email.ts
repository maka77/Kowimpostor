import { Resend } from 'resend';

// Initialize Resend only if key is present to avoid build-time errors
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendRoleEmail(email: string, name: string, role: string, link: string) {
  if (!resend) {
    console.log('[MOCK EMAIL] (Set RESEND_API_KEY to send real emails)');
    console.log(`To: ${email}, Role: ${role}, Link: ${link}`);
    return true;
  }

  try {
    const data = await resend.emails.send({
      from: 'El Impostor <No-reply@kowi.com.ar>',
      to: email, // Only works for your own email in test mode unless domain verified
      subject: 'Tu Identidad Secreta - El Impostor',
      html: `
        <h1>Hola ${name},</h1>
        <p>Tu rol en el juego es: <strong>${role}</strong></p>
        <p>Accede a tu panel de juego aquí:</p>
        <p><a href="${link}">${link}</a></p>
        <p><em>No compartas este enlace.</em></p>
      `
    });
    console.log('Email sent:', data);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}
