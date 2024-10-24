import { ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from '../../../libs/database/db-connections'; // Ensure this path is correct

export async function getMerchantStaffInfo(
  databaseClientService: DatabaseClientService,
  assignedMerchantStaffId: ObjectId,
) {
  // Retrieve the merchants_staff collection from the database
  const staffCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.merchants_staff,
  );

  // Find the staff details based on the given staff ID
  const staffDetails = await staffCollection.findOne({
    _id: new ObjectId(assignedMerchantStaffId),
  });

  // Return the staff details
  return staffDetails;
}
