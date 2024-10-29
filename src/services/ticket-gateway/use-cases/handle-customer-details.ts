import { DatabaseClientService } from 'src/libs/database/index.service';
import { getActiveUsersMap } from './get-active-users-map';

interface Participant {
  type: string;
  organisationId: string;
  outletId?: string;
}

export const handleCustomerDetails = async (
  participant: Participant,
  databaseClientService: DatabaseClientService,
): Promise<{
  activeCustomerSocketId: string | null;
} | null> => {
  try {
    const activeUsers = await getActiveUsersMap(databaseClientService);

    const onlineCustomer = activeUsers.get(
      participant.organisationId.toString(),
    );
    const activeCustomerSocketId = onlineCustomer
      ? onlineCustomer.socketId
      : null;

    if (participant) {
      return {
        activeCustomerSocketId,
      };
    }
  } catch (error) {
    console.error(`Error handling customer: ${error.message}`);
    return null;
  }

  return null;
};
