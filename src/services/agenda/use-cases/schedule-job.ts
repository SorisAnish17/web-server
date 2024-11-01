import { Agenda } from 'agenda';
import { EmailDetailsDto } from '../../../core/dto/email/index';

export const scheduleJob = (agenda: Agenda) => {
  return async (
    emailDetails: EmailDetailsDto,
    time: string = 'in 2 minute',
  ) => {
    try {
      const jobData = {
        emailDetails,
        userId: emailDetails.userId,
        messageId: emailDetails.messageId,
      };

      if (!agenda) {
        throw new Error('Agenda instance is not initialized');
      }

      await agenda.schedule(time, 'send email', jobData);
      console.log(`Successfully scheduled job "send email" at ${time}`);
    } catch (error) {
      console.error('Error scheduling email sending job:', error);
    }
  };
};
