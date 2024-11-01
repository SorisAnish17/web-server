import { EmailClientService } from '../../../libs/email-delivery-client/email-delivery.service';

export const sendEmail = async (emailDetails: {
  messageId: string;
  name: string;
  email: string;
  message: string | File;
}) => {
  try {
    const emailClientService = new EmailClientService();

    if (!emailDetails.email || !emailDetails.message) {
      throw new Error('Email details are incomplete.');
    }

    await emailClientService.sendEmail(emailDetails);
    console.log(`Email sent to ${emailDetails.email} successfully.`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
