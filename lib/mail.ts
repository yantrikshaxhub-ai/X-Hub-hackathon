import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}
import nodemailer from 'nodemailer';

// Email Configuration from Environment
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'yantrikshaxhub@veltech.edu.in';
const SMTP_PASS = process.env.SMTP_PASS || 'zfrzpqilwgbrtuyb';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_FROM = process.env.SMTP_FROM || '"X-Hub Hackathon 2026" <yantrikshaxhub@veltech.edu.in>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS.replace(/\s+/g, ''),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Universal safe email sender.
 * In production with SMTP credentials, sends real email.
 * In local dev without credentials, gracefully logs to console and returns success.
 */
export async function sendEmail({ to, subject, html, text }: SendMailOptions): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
  try {
    const transport = getTransporter();

    if (!transport) {
      // Development simulated mode
      console.log('\n================================================================');
      console.log('📧 [SIMULATED EMAIL DISPATCH - Configure SMTP to send live]');
      console.log(`➡️ To:      ${to}`);
      console.log(`📌 Subject: ${subject}`);
      console.log(`🕒 Time:    ${new Date().toISOString()}`);
      console.log('----------------------------------------------------------------');
      console.log(text || html.replace(/<[^>]+>/g, ' ').slice(0, 250) + '...');
      console.log('================================================================\n');
      return { success: true, simulated: true };
    }

    const info = await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email to', to, error);
    // Non-blocking error handling
    return { success: false };
  }
}

/**
 * Clean Vel Tech Branded Base HTML Template
 */
function wrapInTemplate(title: string, content: string, ctaText?: string, ctaUrl?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #191A1D;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F6F8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #191A1D; padding: 24px 32px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #10B981; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                      Vel Tech University &bull; X-Hub
                    </div>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">
                      X-Hub Hackathon 2026
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; font-size: 14.5px; line-height: 1.65; color: #374151;">
              ${content}

              ${ctaText && ctaUrl ? `
              <div style="margin: 32px 0 16px 0; text-align: center;">
                <a href="${ctaUrl}" style="background-color: #191A1D; color: #FFFFFF; text-decoration: none; padding: 13px 30px; font-size: 14px; font-weight: 700; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">
                  ${ctaText} &rarr;
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Deadlines Notice Strip -->
          <tr>
            <td style="padding: 16px 32px; background-color: #F9FAFB; border-top: 1px solid #EFF1F4; font-size: 12px; color: #6B7280;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <strong>⏳ Key Hackathon Deadlines:</strong><br/>
                    &bull; <strong>23 Oct 2026:</strong> Confirm Participation &amp; Problem Selection<br/>
                    &bull; <strong>05 Nov 2026:</strong> Idea / Abstract Submission<br/>
                    &bull; <strong>30 Nov 2026:</strong> Offline Internal Hackathon (Vel Tech Campus)
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #FFFFFF; border-top: 1px solid #E5E7EB; font-size: 11.5px; color: #9CA3AF; text-align: center;">
              Vel Tech Rangarajan Dr. Sagunthala R&amp;D Institute of Science and Technology<br/>
              Chennai, Tamil Nadu, India &bull; Internal Hackathon Platform
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ============================================================================
// SPECIFIC EMAIL AUTOMATION DISPATCHERS
// ============================================================================

/**
 * 1. Welcome & Account Registration Email
 */
export async function sendWelcomeEmail({
  to,
  name,
  vtNumber,
  department,
}: {
  to: string;
  name: string;
  vtNumber: string;
  department: string;
}) {
  const content = `
    <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
    <p>Welcome to the <strong>X-Hub Hackathon 2026</strong> platform! Your student account has been successfully registered.</p>
    
    <div style="background-color: #F3F4F6; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
      <div style="font-size: 13px; color: #6B7280;">Registration Details</div>
      <div style="font-size: 15px; font-weight: 700; color: #111827; margin-top: 4px;">VTU Number: ${vtNumber}</div>
      <div style="font-size: 14px; color: #374151;">Department: ${department}</div>
    </div>

    <p><strong>Next Action Required before 23rd October 2026:</strong></p>
    <ul style="padding-left: 20px; color: #4B5563;">
      <li>Explore <strong>101 authentic industry problem statements</strong>.</li>
      <li>Register your chosen problem statement to unlock peer discovery.</li>
      <li>Ping students across branches to build your 3-4 member multidisciplinary team.</li>
    </ul>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to X-Hub Hackathon 2026 — Start Building Your Squad!',
    html: wrapInTemplate('Welcome to X-Hub Hackathon', content, 'Explore 101 Statements', `${APP_URL}/problems`),
  });
}

/**
 * 2. Problem Statement Selection Confirmation Email
 */
export async function sendProblemRegistrationEmail({
  to,
  name,
  psCode,
  psTitle,
  companyName,
}: {
  to: string;
  name: string;
  psCode: string;
  psTitle: string;
  companyName: string;
}) {
  const content = `
    <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
    <p>You have successfully registered your interest for <strong>${psCode}</strong>!</p>

    <div style="background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%); border: 1px solid #A7F3D0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.04em;">Selected Challenge</div>
      <div style="font-size: 16px; font-weight: 800; color: #064E3B; margin-top: 4px;">${psCode}: ${psTitle}</div>
      <div style="font-size: 13px; color: #065F46; margin-top: 4px;">Industry Partner: <strong>${companyName}</strong></div>
    </div>

    <p><strong>What to do next:</strong></p>
    <ul style="padding-left: 20px; color: #4B5563;">
      <li>Go to your dashboard to discover candidates from other departments who picked this challenge.</li>
      <li>Use your ping quota to invite teammates.</li>
      <li>Lock your team before the <strong>23rd October 2026</strong> cutoff!</li>
    </ul>
  `;

  return sendEmail({
    to,
    subject: `Registered for ${psCode} • X-Hub Hackathon`,
    html: wrapInTemplate('Problem Statement Registration', content, 'View Squad in Dashboard', `${APP_URL}/dashboard`),
  });
}

/**
 * 3. Team Invitation Received (Ping Alert)
 */
export async function sendTeamInvitationEmail({
  to,
  recipientName,
  senderName,
  senderDept,
  psCode,
  psTitle,
  message,
}: {
  to: string;
  recipientName: string;
  senderName: string;
  senderDept: string;
  psCode: string;
  psTitle: string;
  message?: string;
}) {
  const content = `
    <p style="margin-top: 0;">Hi <strong>${recipientName}</strong>,</p>
    <p><strong>${senderName}</strong> (${senderDept}) just sent you a team invitation to collaborate on an authentic industry problem!</p>

    <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase; letter-spacing: 0.04em;">Problem Statement</div>
      <div style="font-size: 15px; font-weight: 800; color: #1E1B4B; margin-top: 4px;">${psCode}: ${psTitle}</div>
      ${message ? `
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #E0E7FF; font-size: 13px; color: #3730A3; font-style: italic;">
          "${message}"
        </div>
      ` : ''}
    </div>

    <p>Accepting this invitation will add you to this squad. You can accept or decline directly from your student dashboard.</p>
  `;

  return sendEmail({
    to,
    subject: `⚡ ${senderName} invited you to team up for ${psCode}!`,
    html: wrapInTemplate('Team Invitation Received', content, 'Respond to Invitation', `${APP_URL}/dashboard`),
  });
}

/**
 * 4. Invitation Response Alert (Accepted or Declined)
 */
export async function sendInvitationResponseEmail({
  to,
  leaderName,
  peerName,
  peerDept,
  accepted,
  psCode,
}: {
  to: string;
  leaderName: string;
  peerName: string;
  peerDept?: string;
  accepted: boolean;
  psCode: string;
}) {
  const statusColor = accepted ? '#065F46' : '#991B1B';
  const statusBg = accepted ? '#D1FAE5' : '#FEE2E2';

  const content = `
    <p style="margin-top: 0;">Hi <strong>${leaderName}</strong>,</p>
    <p>
      <strong>${peerName}</strong> ${peerDept ? `(${peerDept})` : ''} has 
      <strong style="color: ${statusColor}; background: ${statusBg}; padding: 2px 8px; border-radius: 4px;">
        ${accepted ? 'ACCEPTED' : 'DECLINED'}
      </strong> 
      your invitation for <strong>${psCode}</strong>.
    </p>

    ${accepted ? `
      <p style="color: #065F46;">Your squad roster has been updated! Once your team reaches 3-4 multidisciplinary members, you can lock the team.</p>
    ` : `
      <p style="color: #6B7280;">Your ping quota has been updated so you can reach out to another prospective candidate from the directory.</p>
    `}
  `;

  return sendEmail({
    to,
    subject: accepted 
      ? `🎉 ${peerName} accepted your invite for ${psCode}!` 
      : `Update: ${peerName} declined your invite for ${psCode}`,
    html: wrapInTemplate('Invitation Update', content, 'Go to Dashboard', `${APP_URL}/dashboard`),
  });
}

/**
 * 5. Team Locked & Finalized Email
 */
export async function sendTeamLockedEmail({
  to,
  memberName,
  teamName,
  psCode,
  psTitle,
  memberRoster,
}: {
  to: string;
  memberName: string;
  teamName: string;
  psCode: string;
  psTitle: string;
  memberRoster: string[];
}) {
  const content = `
    <p style="margin-top: 0;">Hi <strong>${memberName}</strong>,</p>
    <p>Congratulations! Your squad has officially been locked and registered for <strong>${psCode}</strong>.</p>

    <div style="background-color: #191A1D; color: #FFFFFF; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; color: #10B981; text-transform: uppercase;">Team Confirmed</div>
      <div style="font-size: 18px; font-weight: 800; margin-top: 4px;">${teamName}</div>
      <div style="font-size: 13px; color: #9CA3AF; margin-top: 4px;">${psCode}: ${psTitle}</div>
      
      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #374151;">
        <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 6px;">Squad Members:</div>
        <ul style="margin: 0; padding-left: 18px; font-size: 13.5px;">
          ${memberRoster.map(m => `<li>${m}</li>`).join('')}
        </ul>
      </div>
    </div>

    <p><strong>Next Milestone:</strong></p>
    <p>Prepare your <strong>Idea / Abstract Proposal</strong>. Deadline for submission is <strong>05th November 2026</strong>. Mentors will be assigned directly to your squad.</p>
  `;

  return sendEmail({
    to,
    subject: `🔒 Squad Locked: ${teamName} is ready for ${psCode}!`,
    html: wrapInTemplate('Team Locked Confirmation', content, 'Open Team Dashboard', `${APP_URL}/dashboard`),
  });
}

/**
 * 6. Faculty Mentor Assignment Notification (To Student Squad)
 */
export async function sendMentorAssignedToStudentEmail({
  to,
  studentName,
  mentorName,
  mentorDept,
  mentorEmail,
  mentorPhone,
  psCode,
  psTitle,
}: {
  to: string;
  studentName: string;
  mentorName: string;
  mentorDept: string;
  mentorEmail: string;
  mentorPhone?: string;
  psCode: string;
  psTitle: string;
}) {
  const content = `
    <p style="margin-top: 0;">Hi <strong>${studentName}</strong>,</p>
    <p>A faculty mentor has been assigned to support your squad for <strong>${psCode} (${psTitle})</strong>!</p>

    <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase;">Faculty Mentor</div>
      <div style="font-size: 17px; font-weight: 800; color: #0F172A; margin-top: 4px;">${mentorName}</div>
      <div style="font-size: 13px; color: #475569;">${mentorDept}</div>
      <div style="font-size: 13px; color: #334155; margin-top: 8px;">
        ✉️ Email: <a href="mailto:${mentorEmail}" style="color: #2563EB;">${mentorEmail}</a>
        ${mentorPhone ? `<br/>📞 Phone: <strong>${mentorPhone}</strong>` : ''}
      </div>
    </div>

    <p>Please reach out to your mentor for guidance on refining your abstract proposal before the <strong>05th November 2026</strong> submission cutoff.</p>
  `;

  return sendEmail({
    to,
    subject: `👨‍🏫 Mentor Assigned: ${mentorName} for ${psCode}`,
    html: wrapInTemplate('Mentor Assigned', content, 'View Squad Details', `${APP_URL}/dashboard`),
  });
}

/**
 * 7. Faculty Mentor Assignment Notification (To Faculty)
 */
export async function sendMentorAssignedToFacultyEmail({
  to,
  mentorName,
  psCode,
  psTitle,
  companyName,
}: {
  to: string;
  mentorName: string;
  psCode: string;
  psTitle: string;
  companyName: string;
}) {
  const content = `
    <p style="margin-top: 0;">Dear <strong>${mentorName}</strong>,</p>
    <p>You have been assigned as the <strong>Faculty Mentor</strong> for <strong>${psCode}</strong> in the X-Hub Hackathon 2026.</p>

    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; color: #4B5563; text-transform: uppercase;">Assigned Problem Statement</div>
      <div style="font-size: 16px; font-weight: 800; color: #111827; margin-top: 4px;">${psCode}: ${psTitle}</div>
      <div style="font-size: 13px; color: #6B7280; margin-top: 4px;">Industry Partner: <strong>${companyName}</strong></div>
    </div>

    <p>You can view registered student squads, track their abstract submissions, and schedule guidance sessions from your Faculty Dashboard.</p>
  `;

  return sendEmail({
    to,
    subject: `X-Hub Hackathon: Mentorship Assignment for ${psCode}`,
    html: wrapInTemplate('Mentorship Assignment', content, 'Open Faculty Dashboard', `${APP_URL}/faculty`),
  });
}
