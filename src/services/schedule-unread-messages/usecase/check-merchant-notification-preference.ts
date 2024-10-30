import { ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from '../../../libs/database/db-connections';

export const checkMerchantNotificationPreference = async (
  staffId: ObjectId,
  databaseClientService: DatabaseClientService,
) => {
  try {
    const connectionDB = await databaseClientService.getDBCollection(
      dbCollectionNames.merchants_staff_settings,
    );

    const checkPermission = await connectionDB.findOne({
      staffId: staffId,
    });

    if (checkPermission) {
      if (
        checkPermission.notificationPreferences?.supportTickets?.email === true
      ) {
        return true;
      }
    }
  } catch (error) {
    console.error('Error checking merchant notification preference:', error);
  }

  return false; // Return false if no preferences or if email notifications are not enabled
};
