import { dbCollectionNames } from '../../../libs/database/db-connections';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { ObjectId } from 'mongodb';

export async function getCustomerDetails(
  databaseClientService: DatabaseClientService,
  customerOrganisationId: ObjectId,
) {
  const customersCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.customers,
  );
  const customerDts = await customersCollection.findOne({
    _id: customerOrganisationId,
  });

  const { firstName, lastName, email, _id: userId } = customerDts;

  return { firstName, lastName, email, userId };
}
