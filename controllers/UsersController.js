import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
    async postNew(request, response) {
        const { email, password } = request.body;
        if (!email) {
            return response.status(400).json({ error: 'Missing email' });
        }
        if (!password) {
            return response.status(400).json({ error: 'Missing password' });
        }

        const existingUser = await dbClient.db.collection('users').findOne({ email });
        if (existingUser) {
            return response.status(400).json({ error: 'Already exist' });
        }

        const hashedPassword = sha1(password);
        const user = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });
        return response.status(201).json({ id: user.insertedId, email });
    }
}

export default UsersController;
