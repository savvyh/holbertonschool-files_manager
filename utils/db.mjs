import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    this.client = new MongoClient(`mongodb://${host}:${port}`);
  }

  isAlive() {
    if (this.client.connect()) {
      return true;
    }
    return false;
  }

  async nbUsers() {
    return this.client.db(database).collection('users').countDocuments({});
  }

  async nbFiles() {
    return this.client.db(database).collection('files').countDocuments({});
  }
}

const dbClient = new DBClient();
export default dbClient;
