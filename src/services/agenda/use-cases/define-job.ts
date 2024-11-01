import { Agenda } from 'agenda';

export const defineJob = (agenda: Agenda) => {
  return async (name: string, jobHandler: (job: any) => Promise<void>) => {
    agenda.define(name, async (job) => {
      try {
        await jobHandler(job);
      } catch (error) {
        console.error(`Error executing job "${name}":`, error);
      }
    });
  };
};
