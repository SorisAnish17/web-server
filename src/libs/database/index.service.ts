import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import {
  MongoClient,
  Db,
  Collection,
  MongoNetworkError,
  MongoServerError,
} from 'mongodb';
import { CollectionNames, dbCollectionNames } from './db-connections';

@Injectable()
export class DatabaseClientService {
  public mongoClient: MongoClient;

  async initialize(): Promise<void> {
    try {
      Logger.log('Initializing Connection with MongoDB Atlas cluster...');

      this.mongoClient = new MongoClient(
        process.env.MONGODB_URI + process.env.MONGODB_SOURCE,
      );

      await this.mongoClient.connect();

      Logger.log('Successfully connected to MongoDB Atlas cluster.');

      const database = this.mongoClient.db(process.env.MONGODB_SOURCE);

      await this.initializeCollections(database);
      await this.initializeIndexes(database);
    } catch (error) {
      if (error instanceof MongoNetworkError) {
        Logger.error(
          'Failed to connect to MongoDB Atlas cluster due to a network error.',
          { error },
        );
      } else if (error instanceof MongoServerError && error.code === 18) {
        Logger.error(
          'Failed to connect to MongoDB Atlas cluster due to invalid credentials.',
          { error },
        );
      } else {
        Logger.error('Failed to connect to MongoDB Atlas cluster.', { error });
      }
      throw error;
    }
  }

  async initializeCollections(database: Db) {
    try {
      Logger.log('Initializing database collections...');

      const existingCollections = (
        await database.listCollections().toArray()
      ).map(({ name }) => name);

      const createdCollections: string[] = [];

      for (const collectionName of Object.keys(dbCollectionNames)) {
        if (!existingCollections.includes(collectionName)) {
          await database.createCollection(collectionName);
          createdCollections.push(collectionName);
        }
      }

      if (createdCollections.length > 0) {
        Logger.log('Created database collections:', { createdCollections });
      } else {
        Logger.log('No new collections needed to be created.');
      }
    } catch (error) {
      Logger.error('Failed to initialize database collections.', { error });
      throw error;
    }
  }

  async initializeIndexes(database: Db) {
    try {
      Logger.log(`Initializing indexes for database: ${database.databaseName}`);

      Logger.log(
        `Indexes initialized successfully for database: ${database.databaseName}`,
      );
    } catch (error) {
      Logger.error(
        `Failed to initialize indexes for database: ${database.databaseName}`,
        { error },
      );
      throw error;
    }
  }

  async getDBCollection<T = Collection>(
    collectionName: CollectionNames,
  ): Promise<T | null> {
    try {
      Logger.debug(`Getting database collection: ${collectionName}`);

      if (!this.mongoClient) {
        Logger.warn('MongoDB client not connected. Reconnecting...');
        await this.initialize();
      }

      return this.mongoClient
        .db(process.env.MONGODB_SOURCE)
        .collection(collectionName) as T;
    } catch (error: any) {
      Logger.error(`Failed to get database collection: ${collectionName}.`, {
        error,
      });
      return error;
    }
  }
}
