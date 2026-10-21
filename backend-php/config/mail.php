<?php
require_once __DIR__ . '/env.php';

function send_smtp_email(string $to, string $subject, string $html): bool {
    $host = env('SMTP_HOST', 'smtp.gmail.com');
    $port = (int)env('SMTP_PORT', 587);
    $user = env('SMTP_USER', 'yantrikshaxhub@veltech.edu.in');
    $pass = env('SMTP_PASS', 'zfrzpqilwgbrtuyb');
    $from = env('SMTP_FROM', '"X-Hub Hackathon 2026" <yantrikshaxhub@veltech.edu.in>');

    if (!$user || !$pass) {
        error_log("[Mail Simulation] To: $to, Subject: $subject");
        return true;
    }

    $pass = preg_replace('/\s+/', '', $pass);

    try {
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ]
        ]);

        $transport = ($port === 465) ? "ssl://$host" : "tcp://$host";
        $socket = @stream_socket_client("$transport:$port", $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            error_log("SMTP connection failed: $errstr ($errno)");
            return false;
        }

        $read = function() use ($socket) {
            $data = '';
            while ($str = fgets($socket, 515)) {
                $data .= $str;
                if (substr($str, 3, 1) === ' ') break;
            }
            return $data;
        };

        $write = function(string $cmd) use ($socket) {
            fputs($socket, $cmd . "\r\n");
        };

        $read(); // greeting
        $write("EHLO " . gethostname());
        $read();

        if ($port === 587) {
            $write("STARTTLS");
            $read();
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($socket);
                return false;
            }
            $write("EHLO " . gethostname());
            $read();
        }

        $write("AUTH LOGIN");
        $read();
        $write(base64_encode($user));
        $read();
        $write(base64_encode($pass));
        $authRes = $read();
        if (!str_starts_with($authRes, '235')) {
            fclose($socket);
            error_log("SMTP Auth failed: $authRes");
            return false;
        }

        $senderEmail = $user;
        if (preg_match('/<([^>]+)>/', $from, $m)) {
            $senderEmail = $m[1];
        }

        $write("MAIL FROM:<$senderEmail>");
        $read();
        $write("RCPT TO:<$to>");
        $read();
        $write("DATA");
        $read();

        $headers = [
            "From: $from",
            "To: $to",
            "Subject: $subject",
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "Date: " . date('r'),
        ];

        $message = implode("\r\n", $headers) . "\r\n\r\n" . $html . "\r\n.";
        $write($message);
        $read();

        $write("QUIT");
        fclose($socket);
        return true;
    } catch (\Throwable $e) {
        error_log("Mail exception: " . $e->getMessage());
        return false;
    }
}

function wrap_in_template(string $title, string $content, ?string $ctaText = null, ?string $ctaUrl = null): string {
    $ctaHtml = ($ctaText && $ctaUrl) ? "
      <div style=\"margin: 32px 0 16px 0; text-align: center;\">
        <a href=\"$ctaUrl\" style=\"background-color: #191A1D; color: #FFFFFF; text-decoration: none; padding: 13px 30px; font-size: 14px; font-weight: 700; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.12);\">
          $ctaText &rarr;
        </a>
      </div>
    " : '';

    return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #191A1D;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F6F8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
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
          <tr>
            <td style="padding: 32px 32px 24px 32px; font-size: 14.5px; line-height: 1.65; color: #374151;">
              {$content}
              {$ctaHtml}
            </td>
          </tr>
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
HTML;
}

function sendWelcomeEmail(string $to, string $name, string $vtNumber, string $department): bool {
    $appUrl = env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    $content = "
      <p style=\"margin-top: 0;\">Hi <strong>{$name}</strong>,</p>
      <p>Welcome to the <strong>X-Hub Hackathon 2026</strong> platform! Your student account has been successfully registered.</p>
      <div style=\"background-color: #F3F4F6; border-radius: 12px; padding: 16px 20px; margin: 20px 0;\">
        <div style=\"font-size: 13px; color: #6B7280;\">Registration Details</div>
        <div style=\"font-size: 15px; font-weight: 700; color: #111827; margin-top: 4px;\">VTU Number: {$vtNumber}</div>
        <div style=\"font-size: 14px; color: #374151;\">Department: {$department}</div>
      </div>
      <p><strong>Next Action Required before 23rd October 2026:</strong></p>
      <ul style=\"padding-left: 20px; color: #4B5563;\">
        <li>Explore <strong>101 authentic industry problem statements</strong>.</li>
        <li>Register your chosen problem statement to unlock peer discovery.</li>
        <li>Ping students across branches to build your 3-4 member multidisciplinary team.</li>
      </ul>
    ";
    $html = wrap_in_template('Welcome to X-Hub Hackathon', $content, 'Explore 101 Statements', "{$appUrl}/problems");
    return send_smtp_email($to, 'Welcome to X-Hub Hackathon 2026 — Start Building Your Squad!', $html);
}

function sendProblemRegistrationEmail(string $to, string $name, string $psCode, string $psTitle, string $companyName): bool {
    $appUrl = env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    $content = "
      <p style=\"margin-top: 0;\">Hi <strong>{$name}</strong>,</p>
      <p>You have successfully registered your interest for <strong>{$psCode}</strong>!</p>
      <div style=\"background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%); border: 1px solid #A7F3D0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;\">
        <div style=\"font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase;\">Selected Challenge</div>
        <div style=\"font-size: 16px; font-weight: 800; color: #064E3B; margin-top: 4px;\">{$psCode}: {$psTitle}</div>
        <div style=\"font-size: 13px; color: #065F46; margin-top: 4px;\">Industry Partner: <strong>{$companyName}</strong></div>
      </div>
      <p><strong>What to do next:</strong></p>
      <ul style=\"padding-left: 20px; color: #4B5563;\">
        <li>Go to your dashboard to discover candidates from other departments.</li>
        <li>Use your ping quota to invite teammates.</li>
        <li>Lock your team before the <strong>23rd October 2026</strong> cutoff!</li>
      </ul>
    ";
    $html = wrap_in_template('Problem Statement Registration', $content, 'View Squad in Dashboard', "{$appUrl}/dashboard");
    return send_smtp_email($to, "Registered for {$psCode} • X-Hub Hackathon", $html);
}

function sendTeamInvitationEmail(string $to, string $recipientName, string $senderName, string $senderDept, string $psCode, string $psTitle, ?string $message = null): bool {
    $appUrl = env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    $msgHtml = $message ? "<div style=\"margin-top: 12px; padding-top: 10px; border-top: 1px solid #E0E7FF; font-size: 13px; color: #3730A3; font-style: italic;\">\"$message\"</div>" : '';
    $content = "
      <p style=\"margin-top: 0;\">Hi <strong>{$recipientName}</strong>,</p>
      <p><strong>{$senderName}</strong> ({$senderDept}) just sent you a team invitation to collaborate on an authentic industry problem!</p>
      <div style=\"background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 12px; padding: 18px 20px; margin: 20px 0;\">
        <div style=\"font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase;\">Problem Statement</div>
        <div style=\"font-size: 15px; font-weight: 800; color: #1E1B4B; margin-top: 4px;\">{$psCode}: {$psTitle}</div>
        {$msgHtml}
      </div>
      <p>Accepting this invitation will add you to this squad. You can accept or decline directly from your student dashboard.</p>
    ";
    $html = wrap_in_template('Team Invitation Received', $content, 'Respond to Invitation', "{$appUrl}/dashboard");
    return send_smtp_email($to, "⚡ {$senderName} invited you to team up for {$psCode}!", $html);
}

function sendInvitationResponseEmail(string $to, string $leaderName, string $peerName, bool $accepted, string $psCode, ?string $peerDept = null): bool {
    $appUrl = env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    $statusColor = $accepted ? '#065F46' : '#991B1B';
    $statusBg = $accepted ? '#D1FAE5' : '#FEE2E2';
    $statusText = $accepted ? 'ACCEPTED' : 'DECLINED';
    $deptText = $peerDept ? "($peerDept)" : '';
    $content = "
      <p style=\"margin-top: 0;\">Hi <strong>{$leaderName}</strong>,</p>
      <p>
        <strong>{$peerName}</strong> {$deptText} has 
        <strong style=\"color: {$statusColor}; background: {$statusBg}; padding: 2px 8px; border-radius: 4px;\">
          {$statusText}
        </strong> 
        your invitation for <strong>{$psCode}</strong>.
      </p>
    ";
    $subject = $accepted ? "🎉 {$peerName} accepted your invite for {$psCode}!" : "Update: {$peerName} declined your invite for {$psCode}";
    $html = wrap_in_template('Invitation Update', $content, 'Go to Dashboard', "{$appUrl}/dashboard");
    return send_smtp_email($to, $subject, $html);
}

function sendMentorAssignedToFacultyEmail(string $to, string $mentorName, string $psCode, string $psTitle, string $companyName): bool {
    $appUrl = env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    $content = "
      <p style=\"margin-top: 0;\">Dear <strong>{$mentorName}</strong>,</p>
      <p>You have been assigned as the <strong>Faculty Mentor</strong> for <strong>{$psCode}</strong> in the X-Hub Hackathon 2026.</p>
      <div style=\"background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px 20px; margin: 20px 0;\">
        <div style=\"font-size: 11px; font-weight: 800; color: #4B5563; text-transform: uppercase;\">Assigned Problem Statement</div>
        <div style=\"font-size: 16px; font-weight: 800; color: #111827; margin-top: 4px;\">{$psCode}: {$psTitle}</div>
        <div style=\"font-size: 13px; color: #6B7280; margin-top: 4px;\">Industry Partner: <strong>{$companyName}</strong></div>
      </div>
      <p>You can view registered student squads, track their abstract submissions, and schedule guidance sessions from your Faculty Dashboard.</p>
    ";
    $html = wrap_in_template('Mentorship Assignment', $content, 'Open Faculty Dashboard', "{$appUrl}/faculty");
    return send_smtp_email($to, "X-Hub Hackathon: Mentorship Assignment for {$psCode}", $html);
}

function sendMentorAssignedToStudentEmail(string $to, string $studentName, string $mentorName, string $mentorDept, string $mentorEmail, ?string $mentorPhone, string $psCode, string $psTitle): bool {
    $appUrl = env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    $phoneHtml = $mentorPhone ? "<br/>📞 Phone: <strong>$mentorPhone</strong>" : '';
    $content = "
      <p style=\"margin-top: 0;\">Hi <strong>{$studentName}</strong>,</p>
      <p>A faculty mentor has been assigned to support your squad for <strong>{$psCode} ({$psTitle})</strong>!</p>
      <div style=\"background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 18px 20px; margin: 20px 0;\">
        <div style=\"font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase;\">Faculty Mentor</div>
        <div style=\"font-size: 17px; font-weight: 800; color: #0F172A; margin-top: 4px;\">{$mentorName}</div>
        <div style=\"font-size: 13px; color: #475569;\">{$mentorDept}</div>
        <div style=\"font-size: 13px; color: #334155; margin-top: 8px;\">
          ✉️ Email: <a href=\"mailto:{$mentorEmail}\" style=\"color: #2563EB;\">{$mentorEmail}</a>
          {$phoneHtml}
        </div>
      </div>
      <p>Please reach out to your mentor for guidance on refining your abstract proposal before the <strong>05th November 2026</strong> submission cutoff.</p>
    ";
    $html = wrap_in_template('Mentor Assigned', $content, 'View Squad Details', "{$appUrl}/dashboard");
    return send_smtp_email($to, "👨‍🏫 Mentor Assigned: {$mentorName} for {$psCode}", $html);
}
