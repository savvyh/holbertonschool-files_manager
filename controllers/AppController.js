import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static async getStatus(response) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    return response.status(200).json(status);
  }

  static async getStats(response) {
    const [users, files] = await Promise.all([
      dbClient.nbUsers(),
      dbClient.nbFiles(),
    ]);
    return response.status(200).json({ users, files });
  }
}

export default AppController;
