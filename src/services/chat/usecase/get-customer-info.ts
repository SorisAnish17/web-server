import { ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from '../../../libs/database/db-connections';
import { handleError } from './handle-error';
import { HttpStatus } from '@nestjs/common';

export async function getCustomerInfo(
  databaseClientService: DatabaseClientService,
  organisationId: string,
) {
  try {
    // Retrieve the customers collection
    const customersCollection = await databaseClientService.getDBCollection(
      dbCollectionNames.customers,
    );

    // Fetch customer by organisation ID
    const customers = await customersCollection
      .find({ _id: new ObjectId(organisationId) })
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
