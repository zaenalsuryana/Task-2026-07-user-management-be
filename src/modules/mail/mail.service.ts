import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendResetPasswordEmail(email: string, resetLink: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Password',
      html: `
        <h2>Reset Password</h2>
        <p>Halo,</p>
        <p>Silakan klik link berikut untuk mengatur ulang password Anda:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Link ini hanya berlaku selama 15 menit.</p>
      `,
    });
  }
}