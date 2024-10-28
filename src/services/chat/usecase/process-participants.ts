import { DatabaseClientService } from '../../../libs/database/index.service'; // Adjust the path as necessary
import { handleCustomer } from './handle-customer';
import { getParticipants } from './get-participant';
import { getMerchantInfo } from './get-merchant-info';

interface ProcessedParticipantsResult {
  activeCustomerSocketId: string | null;
  merchantSocketIds: string[] | null;
}

export async function processParticipants(
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
): Promise<ProcessedParticipantsResult> {
  // Fetch participants from the database
  const participants = await getParticipants(databaseClientService, chatRoomId);

  let activeCustomerSocketId: string | null = null; // Store the active customer socket ID
  const merchantSocketIds: string[] = []; // Initialize as an empty array for merchant socket IDs

  // Process each participant concurrently
  if (participants && participants.length > 0) {
    await Promise.all(
      participants.map((participant) =>
        processParticipant(participant, chatRoomId, databaseClientService),
      ),
    ).then((results) => {
      results.forEach((result) => {
        if (result.activeCustomerSocketId) {
          activeCustomerSocketId = result.activeCustomerSocketId; // Update if available
        }
        if (result.merchantSocketIds) {
          merchantSocketIds.push(...result.merchantSocketIds); // Collect merchant socket IDs
        }
      });
    });
  }

  return {
    activeCustomerSocketId,
    merchantSocketIds: merchantSocketIds.length > 0 ? merchantSocketIds : null,
  };
}

// Function to process individual participants
async function processParticipant(
  participant: any, // Use a specific type if available
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
): Promise<{
  activeCustomerSocketId: string | null;
  merchantSocketIds: string[] | null;
}> {
  try {
    if (participant.type === 'customer') {
      // Handle customer and return active socket ID
      const customerInfo = await handleCustomer(
        participant,
        databaseClientService,
      );
      return {
        activeCustomerSocketId: customerInfo?.activeCustomerSocketId || null,
        merchantSocketIds: null, // No merchant IDs for customers
      };
    } else if (participant.type === 'merchant' && participant.outletId) {
      const merchantSocketId = await getMerchantInfo(
        participant.organisationId,
        participant.outletId,
        chatRoomId,
        databaseClientService,
      );

      return {
        activeCustomerSocketId: null,
        merchantSocketIds:
          merchantSocketId.length > 0 ? merchantSocketId : null,
      };
    }
  } catch (error) {
    console.error(
      `Error processing participant of type "${participant.type}": ${error.message}`,
    );
  }

  return { activeCustomerSocketId: null, merchantSocketIds: null }; // Default return
}
