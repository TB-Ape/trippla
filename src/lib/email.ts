import { Resend } from "resend";

// Lazy-initialize Resend so it doesn't crash during build when env vars aren't set
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!);
  }
  return _resend;
}

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  // Log for debugging
  console.log("🔑 Resend API Key present:", !!process.env.RESEND_API_KEY);
  console.log("🌐 Verify URL:", verifyUrl);
  console.log("📧 Sending to:", email);

  try {
    await getResend().emails.send({
      from: "TRIPPLA <trippla@tbape.net>", // Change this to your verified domain
      to: email,
      subject: "Verify your email address",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                border: 2px solid rgba(20, 184, 166, 0.3);
                padding: 40px;
                text-align: center;
              }
              .logo {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #14b8a6, #06b6d4, #10b981);
                transform: rotate(45deg);
                margin: 0 auto 20px;
              }
              h1 {
                color: #ffffff;
                font-size: 32px;
                font-weight: 900;
                margin-bottom: 20px;
                letter-spacing: -0.02em;
              }
              .gradient-text {
                background: linear-gradient(90deg, #14b8a6, #06b6d4, #10b981);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              }
              p {
                color: #d1d5db;
                font-size: 16px;
                margin-bottom: 30px;
              }
              .button {
                display: inline-block;
                background: linear-gradient(90deg, #14b8a6, #06b6d4);
                color: #ffffff;
                text-decoration: none;
                padding: 16px 40px;
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                transition: transform 0.2s;
              }
              .button:hover {
                transform: scale(1.05);
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                color: #9ca3af;
                font-size: 14px;
              }
              .link {
                color: #14b8a6;
                word-break: break-all;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo"></div>
              <h1>
                Welcome to <span class="gradient-text">TRIPPLA</span>
              </h1>
              <p>
                Thanks for signing up! Please verify your email address to start planning your adventures.
              </p>
              <a href="${verifyUrl}" class="button">
                Verify Email Address
              </a>
              <div class="footer">
                <p>
                  Or copy and paste this link into your browser:<br>
                  <a href="${verifyUrl}" class="link">${verifyUrl}</a>
                </p>
                <p>
                  If you didn't create an account with TRIPPLA, you can safely ignore this email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  try {
    await getResend().emails.send({
      from: "TRIPPLA <onboarding@resend.dev>",
      to: email,
      subject: "Reset your password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
                border: 2px solid rgba(20, 184, 166, 0.3);
                padding: 40px;
                text-align: center;
              }
              .logo {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #14b8a6, #06b6d4, #10b981);
                transform: rotate(45deg);
                margin: 0 auto 20px;
              }
              h1 {
                color: #ffffff;
                font-size: 32px;
                font-weight: 900;
                margin-bottom: 20px;
              }
              p {
                color: #d1d5db;
                font-size: 16px;
                margin-bottom: 30px;
              }
              .button {
                display: inline-block;
                background: linear-gradient(90deg, #14b8a6, #06b6d4);
                color: #ffffff;
                text-decoration: none;
                padding: 16px 40px;
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.1em;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                color: #9ca3af;
                font-size: 14px;
              }
              .link {
                color: #14b8a6;
                word-break: break-all;
                text-decoration: none;
              }
              .warning {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                padding: 15px;
                margin: 20px 0;
                color: #fca5a5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo"></div>
              <h1>Reset Your Password</h1>
              <p>
                You requested to reset your password. Click the button below to set a new password.
              </p>
              <a href="${resetUrl}" class="button">
                Reset Password
              </a>
              <div class="warning">
                This link will expire in 1 hour for security reasons.
              </div>
              <div class="footer">
                <p>
                  Or copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" class="link">${resetUrl}</a>
                </p>
                <p>
                  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error };
  }
}
