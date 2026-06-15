import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.getOrThrow<string>('RESEND_API_KEY'));
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Aura Spa');
    const fromAddress = this.configService.getOrThrow<string>('MAIL_FROM');

    const { error } = await this.resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject: 'Verify your Aura Spa account',
      html: this.buildOtpEmailHtml(otp),
    });

    if (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw new Error(error.message);
    }
  }

  private buildOtpEmailHtml(otp: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #8B7355;">Verify your Aura Spa account</h2>
        <p>Use the following code to verify your email address. It expires in <strong>10 minutes</strong>.</p>
        <div style="
          display: inline-block;
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #8B7355;
          background: #f9f5f0;
          border: 2px solid #d4c5b0;
          border-radius: 8px;
          padding: 16px 32px;
          margin: 24px 0;
        ">${otp}</div>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          If you did not register for an Aura Spa account, please ignore this email.
        </p>
      </div>
    `;
  }
}
