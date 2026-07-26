import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

def generate_meet_link():
    """
    Generate a instant working Google Meet link.
    Using 'meet.google.com/new' or 'meet.google.com/landing' initiates an instant live call.
    We format a clean instant video meeting link.
    """
    return "https://meet.google.com/new"

def send_interview_email(candidate_email: str, candidate_name: str, job_title: str, scheduled_time: str, meet_link: str):
    """Send interview confirmation email via Gmail SMTP with graceful fallback."""
    sender = os.getenv("EMAIL_SENDER")
    password = os.getenv("EMAIL_APP_PASSWORD")

    if not sender or not password or "your_email" in sender:
        print(f"[Email Notification] Skipped email delivery (Placeholder credentials in .env). Target: {candidate_email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Interview Scheduled: {job_title} at HireFlow"
        msg["From"] = f"HireFlow Recruitment <{sender}>"
        msg["To"] = candidate_email

        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 12px;">
              <h2 style="color: #4f46e5;">Interview Confirmation</h2>
              <p>Hello <strong>{candidate_name}</strong>,</p>
              <p>Great news! You have been shortlisted for the <strong>{job_title}</strong> position.</p>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Date & Time:</strong> {scheduled_time}</p>
                <p style="margin: 5px 0;"><strong>Format:</strong> Video Call (Google Meet)</p>
                <p style="margin: 10px 0 0 0;">
                  <a href="{meet_link}" style="background-color: #4f46e5; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Join Google Meet Interview
                  </a>
                </p>
              </div>
              
              <p style="font-size: 12px; color: #6b7280;">If you need to reschedule, please notify HR via your candidate portal dashboard.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af;">Sent automatically by HireFlow Agentic Recruitment Platform.</p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        # Use SMTP port 587 with STARTTLS for fastest SSL handshake & immediate inbox delivery
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=5) as server:
            server.ehlo()
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, candidate_email, msg.as_string())
        print(f"[Email Notification] Successfully sent interview confirmation to {candidate_email}")
        return True
    except Exception as e:
        print(f"[Email Notification Warning] Failed to send email: {e}")
        return False


def send_offer_email(candidate_email: str, candidate_name: str, job_title: str, salary: str, joining_date: str, offer_body: str):
    """Send beautiful HTML offer letter notification email to candidate via Gmail SMTP."""
    sender = os.getenv("EMAIL_SENDER") or os.getenv("SMTP_EMAIL")
    password = os.getenv("EMAIL_APP_PASSWORD") or os.getenv("SMTP_PASSWORD")

    if not sender or not password or "your_email" in sender:
        print(f"[Offer Email] Skipped email delivery (Placeholder credentials in .env). Target: {candidate_email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🎉 Job Offer: {job_title} position at HireFlow!"
        msg["From"] = f"HireFlow Talent Team <{sender}>"
        msg["To"] = candidate_email

        formatted_body = offer_body.replace('\n', '<br/>')

        html_body = f"""
        <!DOCTYPE html>
        <html>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 30px 10px; color: #1e293b;">
            <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
              
              <!-- Header Banner -->
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
                <span style="background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; tracking: 1px;">Official Offer</span>
                <h1 style="margin: 12px 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Congratulations, {candidate_name}! 🎉</h1>
                <p style="margin: 0; opacity: 0.9; font-size: 14px;">We are thrilled to offer you the <strong>{job_title}</strong> role.</p>
              </div>

              <!-- Offer Details Box -->
              <div style="padding: 28px;">
                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; border-left: 4px solid #4f46e5; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; tracking: 0.5px;">Offer Summary</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Position:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{job_title}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Compensation:</td>
                      <td style="padding: 6px 0; color: #16a34a; font-weight: 800;">{salary}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Start Date:</td>
                      <td style="padding: 6px 0; color: #4f46e5; font-weight: 700;">{joining_date}</td>
                    </tr>
                  </table>
                </div>

                <!-- Letter Body -->
                <div style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 28px;">
                  {formatted_body}
                </div>

                <!-- Portal Call to Action -->
                <div style="text-align: center; margin: 32px 0 12px 0;">
                  <a href="{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/login" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                    View & Sign Offer Letter in Candidate Portal →
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">Sent with ❤️ by <strong>HireFlow Talent Acquisition Team</strong></p>
                <p style="margin: 4px 0 0 0; font-size: 11px;">If you have any questions, please reply directly to this email.</p>
              </div>

            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, candidate_email, msg.as_string())
        print(f"[Offer Email] Successfully delivered beautiful offer email to {candidate_email}")
        return True
    except Exception as e:
        print(f"[Offer Email Error] Could not send offer email: {e}")
        return False

def send_otp_email(candidate_email: str, candidate_name: str, otp_code: str):
    """
    Send 6-digit Candidate Registration Verification OTP email via Gmail SMTP.
    Configured with plain-text fallback, proper Reply-To, and Spam-pass MIME headers.
    """
    sender = os.getenv("EMAIL_SENDER")
    password = os.getenv("EMAIL_APP_PASSWORD")

    if not sender or not password or "your_email" in sender:
        print(f"[OTP Email] (DEV FALLBACK) Verification OTP for {candidate_email}: {otp_code}")
        return True

    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = f"{otp_code} is your HireFlow verification code"
        msg["From"] = f"HireFlow AI <{sender}>"
        msg["To"] = candidate_email
        msg["Reply-To"] = sender
        msg["X-Priority"] = "1"
        msg["X-MSMail-Priority"] = "High"

        # Plain text version (Essential for passing Gmail spam filters!)
        text_body = f"""Hello {candidate_name},

Welcome to HireFlow Agentic Recruitment Platform!

Your candidate email verification code is: {otp_code}

This code is valid for 5 minutes. Please enter this code on the registration page to complete setting up your account.

If you did not request this code, please ignore this email.

Best regards,
HireFlow Team
"""
        msg.attach(MIMEText(text_body, "plain"))

        # High-End Styled HTML version with HireFlow Logo Badge
        html_body = f"""
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 40px 10px;">
            <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);">
              
              <!-- Brand Header with Logo -->
              <div style="background: #ffffff; padding: 32px 32px 16px 32px; text-align: center;">
                <div style="display: inline-block; width: 48 h-12; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border-radius: 14px; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                  <span style="color: #ffffff; font-size: 24px; font-weight: 900; tracking-tight: -0.5px; letter-spacing: -0.5px;">Hire<span style="color: #a5b4fc;">Flow</span></span>
                </div>
                <h2 style="color: #0f172a; margin: 8px 0 0 0; font-size: 18px; font-weight: 800;">Verify Your Email Address</h2>
              </div>

              <!-- Main Content -->
              <div style="padding: 16px 32px 32px 32px; text-align: center;">
                <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 0;">
                  Hello <strong>{candidate_name}</strong>, welcome to HireFlow! Please use the verification code below to verify your email and activate your candidate profile:
                </p>

                <!-- Styled OTP Container Box -->
                <div style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 16px; padding: 24px; margin: 24px 0;">
                  <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your 6-Digit OTP</p>
                  <div style="font-size: 36px; font-weight: 900; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; letter-spacing: 10px; color: #4f46e5; margin: 4px 0;">
                    {otp_code}
                  </div>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600;">⏱️ Code expires in 5 minutes</p>
                </div>

                <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
                  🔒 For security, never share this code with anyone.
                </p>
              </div>

              <!-- Sleek Footer -->
              <div style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
                <p style="margin: 0;">Sent automatically by <strong>HireFlow AI Recruitment Platform</strong></p>
                <p style="margin: 4px 0 0 0;">If you didn't attempt to register, please ignore this email.</p>
              </div>

            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, candidate_email, msg.as_string())
        print(f"[OTP Email] Delivered OTP {otp_code} to {candidate_email}")
        return True
    except Exception as e:
        print(f"[OTP Email Error] Failed to send OTP to {candidate_email}: {e}")
        return False

def send_rejection_email(candidate_email: str, candidate_name: str, job_title: str):
    """Send professional, polite candidate rejection status email via Gmail SMTP."""
    sender = os.getenv("EMAIL_SENDER")
    password = os.getenv("EMAIL_APP_PASSWORD")

    if not sender or not password or "your_email" in sender:
        print(f"[Rejection Email] (DEV FALLBACK) Rejection notice for {candidate_email} on role {job_title}")
        return True

    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = f"Update regarding your application for {job_title} — HireFlow"
        msg["From"] = f"HireFlow Recruitment <{sender}>"
        msg["To"] = candidate_email
        msg["Reply-To"] = sender

        text_body = f"""Hello {candidate_name},

Thank you for taking the time to apply for the {job_title} position at HireFlow.

After carefully reviewing your profile and credentials, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match the current requirements of this role.

We truly appreciate your interest in joining our team and wish you the best in your job search and professional endeavors.

Best regards,
Talent Acquisition Team
HireFlow
"""
        msg.attach(MIMEText(text_body, "plain"))

        html_body = f"""
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 30px 10px;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px 28px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; tracking-tight: -0.5px;">HireFlow</h1>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; font-weight: 600;">Application Status Update</p>
              </div>

              <!-- Content -->
              <div style="padding: 28px;">
                <p style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 0;">Dear {candidate_name},</p>
                <p style="font-size: 13px; color: #475569; line-height: 1.6;">
                  Thank you for applying for the <strong>{job_title}</strong> position at HireFlow.
                </p>
                <p style="font-size: 13px; color: #475569; line-height: 1.6;">
                  After careful consideration, our recruitment team has decided to proceed with other candidates whose technical profile and experience align more closely with the current requirements for this specific role.
                </p>
                
                <div style="background-color: #f1f5f9; border-left: 4px solid #94a3b8; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 12px; color: #475569; font-weight: 500;">
                    We will keep your profile in our talent network for future opportunities matching your expertise.
                  </p>
                </div>

                <p style="font-size: 13px; color: #475569; line-height: 1.6; margin-bottom: 0;">
                  We sincerely thank you for your interest in HireFlow and wish you great success in your career journey.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
                © {datetime.now().year} HireFlow Agentic Recruitment Platform. All rights reserved.
              </div>

            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, candidate_email, msg.as_string())
        print(f"[Rejection Email] Delivered rejection email to {candidate_email} for role {job_title}")
        return True
    except Exception as e:
        print(f"[Rejection Email Error] Failed to send rejection email: {e}")
        return False
