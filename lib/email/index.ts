import { Resend } from 'resend';

// Lazy initialization - only create Resend instance when API key is available
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendInvitationEmail(email: string, teamName: string, inviteId: number) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Skipping invitation email.');
    return;
  }

  const inviteLink = `${process.env.BASE_URL}/sign-up?inviteId=${inviteId}`;
  const appName = 'WhatsSaaS';

  try {
    await resend.emails.send({
      from: `${appName} <onboarding@resend.dev>`,
      to: email,
      subject: `Invitation to join ${teamName} on ${appName}`,
      html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
          <h2>You've been invited!</h2>
          <p>You have been invited to join the team <strong>${teamName}</strong> on ${appName}.</p>
          <p>Click the link below to accept the invitation and set up your account:</p>
          <p>
            <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #44A64D; color: white; text-decoration: none; border-radius: 5px;">
              Accept Invitation
            </a>
          </p>
          <p style="font-size: 14px; color: #666;">
            Or copy this link: <br />
            <a href="${inviteLink}">${inviteLink}</a>
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw - email failure shouldn't break the invitation flow
  }
}
