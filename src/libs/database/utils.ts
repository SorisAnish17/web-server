import { ObjectId } from 'mongodb';

const convertToObjectId = (id: ObjectId | string): ObjectId => {
  if (typeof id === 'string') {
    return new ObjectId(id);
  } else {
    return id;
  }
};

const createdTimestamp = () => {
  const now = new Date();
  return { createdAt: now, updatedAt: now };
};

const updatedTimestamp = () => {
  const now = new Date();
  return { updatedAt: now };
};

const convertPagination = (pagination: { size: number; pageNo: number }) => {
  return {
    skip: (pagination.pageNo - 1) * pagination.size,
    limit: pagination.size,
  };
};

export const dbUtils = {
  convertToObjectId,
  createdTimestamp,
  updatedTimestamp,
  convertPagination,
};
