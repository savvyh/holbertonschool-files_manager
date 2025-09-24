import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    this.db = null;
    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
      })
      .catch(() => {
        this.db = null;
      });
  }

  isAlive() {
    return this.db !== null;
  }

  async nbUsers() {
    if (!this.db) {
      return 0;
    }
    return this.db.collection('users').countDocuments({});
  }

  async nbFiles() {
    if (!this.db) {
      return 0;
    }
    return this.db.collection('files').countDocuments({});
  }
}

const dbClient = new DBClient();
export default dbClient;
