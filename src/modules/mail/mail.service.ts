import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type MailDriver = 'console' | 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly driver: MailDriver;
  private readonly resend: Resend | null;

  constructor(private readonly configService: ConfigService) {
    this.driver = this.resolveMailDriver();
    this.resend = this.driver === 'resend' ? new Resend(this.configService.getOrThrow<string>('RESEND_API_KEY')) : null;
  }

  async sendWelcomeEmail(to: string, fullName: string, password: string): Promise<void> {
    if (this.driver === 'console') {
      this.logger.warn(`MAIL_DRIVER=console; Welcome email for ${to} (password omitted from log)`);
      return;
    }

    if (!this.resend) throw new Error('Resend mail driver is not initialized');

    const fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Aura Spa');
    const fromAddress = this.configService.getOrThrow<string>('MAIL_FROM');

    const { error } = await this.resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject: 'Tài khoản Aura Spa của bạn đã được tạo',
      html: this.buildWelcomeEmailHtml(fullName, to, password),
    });

    if (error) {
      this.logger.error(`Failed to send welcome email to ${to}: ${error.message}`);
    }
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    if (this.driver === 'console') {
      this.logger.warn(`MAIL_DRIVER=console; OTP for ${to}: ${otp}`);
      return;
    }

    if (!this.resend) {
      throw new Error('Resend mail driver is not initialized');
    }

    const fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Aura Spa');
    const fromAddress = this.configService.getOrThrow<string>('MAIL_FROM');

    const { error } = await this.resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject: 'Verify your Aura Spa account',
      html: this.buildOtpEmailHtml(otp),
    });

    if (error) {
      this.logger.error(`Failed to send OTP email to ${to}: ${error.message}`);
      throw new Error(error.message);
    }
  }

  private buildWelcomeEmailHtml(fullName: string, email: string, password: string): string {
    /* eslint-disable max-len */
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #8B7355;">Chào mừng đến với Aura Spa, ${fullName}!</h2>
        <p>Tài khoản quản lý của bạn đã được tạo. Dưới đây là thông tin đăng nhập:</p>
        <div style="background: #f9f5f0; border: 1px solid #d4c5b0; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Mật khẩu tạm:</strong> <span style="font-family: monospace; font-size: 16px; color: #8B7355;">${password}</span></p>
        </div>
        <p style="color: #c0392b; font-weight: bold;">Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          Nếu bạn không yêu cầu tài khoản này, vui lòng liên hệ quản trị viên.
        </p>
      </div>
    `;
    /* eslint-enable max-len */
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

  private resolveMailDriver(): MailDriver {
    const configuredDriver = this.configService.get<string>('MAIL_DRIVER');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (!configuredDriver) {
      return nodeEnv === 'production' ? 'resend' : 'console';
    }

    const driver = configuredDriver.trim().toLowerCase();
    if (driver === 'console' || driver === 'resend') {
      return driver;
    }

    throw new Error(`Unsupported MAIL_DRIVER "${configuredDriver}". Use "console" or "resend".`);
  }
}
