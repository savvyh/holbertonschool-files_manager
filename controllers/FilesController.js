import { v4 as uuidv4 } from 'uuid';
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
      name, type, parentId, isPublic, data,
    } = request.body;
    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return response.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }

    if (parentId && !dbClient.db.collection('files').findOne({ _id: parentId })) {
      return response.status(400).json({ error: 'Parent not found' });
    }
    if (parentId && dbClient.db.collection('files').findOne({ _id: parentId }).type !== 'folder') {
      return response.status(400).json({ error: 'Parent is not a folder' });
    }

    if (type === 'folder') {
      const file = await dbClient.db.collection('files').insertOne({
        name, type, parentId, isPublic, userId,
      });
      return response.status(201).json(file);
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileName = uuidv4();
    const localPath = `${folderPath}/${fileName}`;

    const newFile = await dbClient.db.collection('files').insertOne({
      userId, name, type, isPublic, parentId, localPath,
    });
    return response.status(201).json(newFile);
  }
}

export default FilesController;
