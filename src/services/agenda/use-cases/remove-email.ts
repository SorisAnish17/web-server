import { dbCollectionNames } from 'src/libs/database/db-connections';
import { DatabaseClientService } from '../../../libs/database/index.service';

export const removeEmailByEmail = async (email) => {
  const databaseClientServcie = new DatabaseClientService();
  try {
    const connectionDB = await databaseClientServcie.getDBCollection(
      dbCollectionNames.schedule_unread_messages,
    );
    const result = await connectionDB.deleteOne({ email });
    if (result.deletedCount === 0) {
      console.warn(`No entry found to delete for ${email}`);
    } else {
      console.log(`Deleted email entry for ${email}`);
    }
  } catch (error) {
    console.error('Error deleting message from DB:', error);
  }
};
