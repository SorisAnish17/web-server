import { ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../../libs/database/index.service'; // Adjust the path as necessary
import { dbCollectionNames } from '../../../libs/database/db-connections'; // Ensure correct path
import { HttpException, HttpStatus } from '@nestjs/common'; // For HttpStatus
import { getActiveUsersMap } from './get-active-users-map'; // Ensure correct path

export async function checkMerchantRoleAndStatus(
  databaseClientService: DatabaseClientService,
  organisationId: string,
  outletId: string,
) {
  try {
    // Step 1: Fetch the roles and permissions for the organization
    const rolesCollection = await databaseClientService.getDBCollection(
      dbCollectionNames.merchants_roles_and_permissions,
    );

    const staffCollection = await databaseClientService.getDBCollection(
      dbCollectionNames.merchants_staff,
    );

    // Step 2: Retrieve roles and permissions based on the merchantId
    const rolesAndPermissions = await rolesCollection
      .find({ merchantId: new ObjectId(organisationId) })
      .toArray();

    // Step 3: Filter roles that have access to support and chat features
    const filteredRoles = rolesAndPermissions
      .filter(
        (role) =>
          role.permissions.support.includes('access') &&
          role.permissions.support.includes('chat'), // Fixed the typo here
      )
      .map((role) => role.role);

    // Step 4: Retrieve staff members that belong to the filtered roles and selected outlet
    const staffMembers = await staffCollection
      .find({ selectedOutlet: outletId, role: { $in: filteredRoles } })
      .toArray();

    // Step 5: Fetch the map of active users
    const activeUsersMap = await getActiveUsersMap(databaseClientService);

    // Step 6: Filter staff members who are active (present in the activeUsersMap)
    const activeStaffs = staffMembers
      .filter((staff) => activeUsersMap.has(staff._id.toString()))
      .map((staff) => ({
        userId: staff._id,
        socketId: activeUsersMap.get(staff._id.toString())?.socketId || null,
      }));

    // Step 7: Return active staff members and all staff members
    return { activeStaffs, staffMembers };
  } catch (error) {
    // Step 8: Handle any errors that occur during the process
    throw new HttpException(
      `Error fetching roles and permissions: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
