import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static async getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    return res.status(200).json(status);
  }

  static async getStats(req, res) {
    const [users, files] = await Promise.all([
      dbClient.nbUsers(),
      dbClient.nbFiles(),
    ]);
    return res.status(200).json({ users, files });
  }
}

export default AppController;
