import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from '../../../libs/database/db-connections'; // Ensure correct path

export async function getActiveUsersMap(
  databaseClientService: DatabaseClientService,
): Promise<Map<string, { socketId: string }>> {
  // Retrieve the online activity collection
  const onlineActivityCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.online_activity,
  );

  // Find all users who are currently online
  const activeUsersData = await onlineActivityCollection
    .find({ status: 'online' })
    .toArray();

  // Build a map with the userId as key and socketId as value
  return new Map(
    activeUsersData.map((user) => [
      user.userId.toString(),
      { socketId: user.socketId }, // Ensure socketId is included
    ]),
  );
}
