import { getMerchantInfo } from './get-merchant-info';
import { DatabaseClientService } from '../../../libs/database/index.service'; // Adjust the path as necessary

export async function handleMerchantParticipant(
  participant: { organisationId: string; outletId: string }, // Define participant structure if needed
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
) {
  // Destructure participant to get organisationId and outletId
  const { organisationId, outletId } = participant;

  // Call the getMerchantInfo use case to retrieve merchant info based on participant details
  await getMerchantInfo(
    organisationId,
    outletId,
    chatRoomId,
    databaseClientService,
  );
}
