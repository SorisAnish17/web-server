import { Injectable, Logger } from '@nestjs/common';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailClientService {
  private readonly logger = new Logger(EmailClientService.name);
  private apiInstance: TransactionalEmailsApi;

  initialize() {
    this.apiInstance = new TransactionalEmailsApi();
    this.apiInstance.defaultHeaders = {
      'api-key': process.env.EMAIL_PROVIDER_API_KEY,
    };
  }

  async sendEmail(scheduleDetails: {
    email: string;
    name: string;
    messageId: string;
    message: string | File;
  }): Promise<void> {
    if (!this.apiInstance) {
      this.initialize();
    }

    const sendSmtpEmail = new SendSmtpEmail();
    this.logger.log(`Sending email to: ${scheduleDetails.email}`);

    const templateSource = `
      <p>Hi {{name}},</p>
      <p>You have received a new message:</p>
      <div style="background-color: #e7f3fe; padding: 10px; border-left: 5px solid #2196F3; margin: 20px 0;">
        <h3>{{message}}</h3>
      </div>
      <p>Click <a href="{{chatLink}}">here</a> to view the chat.</p>
      <p>If you didn't expect to receive this notification, please ignore this email.</p>
    `;
    const template = Handlebars.compile(templateSource);
    const htmlContent = template(scheduleDetails);

    sendSmtpEmail.subject = `New Message Notification for ID: ${scheduleDetails.messageId}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      email: 'galleycloud@gmail.com',
      name: 'galleycloud',
    };
    sendSmtpEmail.to = [
      {
        email: scheduleDetails.email,
        name: scheduleDetails.name,
      },
    ];
    sendSmtpEmail.replyTo = {
      email: 'galleycloud@gmail.com',
      name: 'galleycloud',
    };

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail, {
        headers: {
          'api-key': process.env.EMAIL_PROVIDER_API_KEY,
        },
      });
      this.logger.log('Email sent successfully');
    } catch (error) {
      this.logger.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }
}
