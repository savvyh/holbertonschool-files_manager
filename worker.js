import Bull from 'bull';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });
  if (!file) {
    throw new Error('File not found');
  }

  const thumbnailSizes = [500, 250, 100];
  for (const size of thumbnailSizes) {
    const thumbnail = imageThumbnail(file.localPath, { width: size });
    const thumbnailPath = `${file.localPath}_${size}`;
    fs.writeFileSync(thumbnailPath, thumbnail.data);
  }
});
