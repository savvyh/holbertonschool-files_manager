import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fileSystem from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(request, response) {
    const token = request.headers['x-token'];
    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic, data,
    } = request.body;
    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return response.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      const fileResult = await dbClient.db.collection('files').insertOne({
        userId: ObjectId(userId), name, type, parentId, isPublic,
      });
      return response.status(201).json({
        id: fileResult.insertedId, userId, name, type, parentId, isPublic,
      });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fileSystem.existsSync(folderPath)) {
      fileSystem.mkdirSync(folderPath, { recursive: true });
    }

    const fileName = uuidv4();
    const localPath = `${folderPath}/${fileName}`;
    const result = await dbClient.db.collection('files').insertOne({
      userId: ObjectId(userId), name, type, isPublic, parentId, localPath,
    });

    const fileContent = Buffer.from(data, 'base64');
    fileSystem.writeFileSync(localPath, fileContent);

    return response.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    });
  }

  static async getShow(request, response) {
    const token = request.headers['x-token'] || request.headers['X-Token'];

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const userFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!userFile) {
      return response.status(404).json({ error: 'Not found' });
    }
    return response.status(200).json(userFile);
  }

  static async getIndex(request, response) {
    const token = request.headers['x-token'] || request.headers['X-Token'];
    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = request.query.parentId || 0;
    const page = request.query.page || 0;

    const query = {
      userId: ObjectId(userId),
    };

    if (parentId === '0' || parentId === 0) {
      query.parentId = 0;
    } else {
      query.parentId = ObjectId(parentId);
    }

    const files = await dbClient.db.collection('files').aggregate([
      { $match: query },
      { $skip: page * 20 },
      { $limit: 20 },
    ]).toArray();

    return response.status(200).json(files);
  }

  static async putPublish(request, response) {
    const token = request.headers['x-token'] || request.headers['X-Token'];
    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    file.isPublic = true;
    await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
    return response.status(200).json(file);
  }

  static async putUnpublish(request, response) {
    const token = request.headers['x-token'] || request.headers['X-Token'];
    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = request.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }

    file.isPublic = false;
    await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
    return response.status(200).json(file);
  }

  static async getFile(request, response) {
    const token = request.headers['x-token'] || request.headers['X-Token'];
    const userId = await redisClient.get(`auth_${token}`);

    const fileId = request.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
    if (file.isPublic === false && file.userId !== ObjectId(userId)) {
      return response.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
        return response.status(400).json({ error: 'A folder doesn\'t have content' });
    }
    if (!fileSystem.existsSync(file.localPath)) {
      return response.status(404).json({ error: 'Not found' });
    }

    const filePath = file.localPath;
    const fileContent = fileSystem.readFileSync(filePath);
    const mimeType = mime.getType(filePath);
    return response.status(200).set('Content-Type', mimeType).send(fileContent);
  }
}

export default FilesController;
