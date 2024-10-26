import { ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from '../../../libs/database/db-connections'; // Ensure this path is correct
import { handleError } from './handle-error'; // Ensure handleError is imported from the correct path
import { HttpStatus } from '@nestjs/common'; // For HttpStatus usage

export async function getCustomerInfo(
  databaseClientService: DatabaseClientService,
  organisationIds: string[],
) {
  try {
    // Retrieve the customers collection
    const customersCollection = await databaseClientService.getDBCollection(
      dbCollectionNames.customers,
    );

    // Fetch customers whose IDs match those in the organisationIds array
    const customers = await customersCollection
      .find({ _id: { $in: organisationIds.map((id) => new ObjectId(id)) } })
      .toArray();

    // Handle the case where no customers are found
    if (customers.length === 0) {
      handleError('No customers found', HttpStatus.NOT_FOUND);
    }

    return customers;
  } catch (error) {
    // Handle any errors that occur during retrieval
    handleError('Error retrieving customers: ' + error.message);
  }
}
