import { 
    createUser as _createUser, 
    getUserByEmail as _getUserByEmail,
    updateUser as _updateUser,
    updateUserRoleByEmail as _updateUserRoleByEmail,
    getAllUsers as _getAllUsers
} from '../database/query.js';
import bcrypt from 'bcrypt';

export async function createUser(req, res) {
    try {
        console.log(req.body);
        const {email, username, password } = req.body;


        if (!email || !username || !password) {
            return res.status(400).json({ error: 'email, username and password are required' });
        }

        // Check if email already exists
        const existingUser = await _getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'email already exists' });
        }

        // check if password is valid
        const isMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasDigit = /\d/.test(password);

        if (!isMinLength || !hasUpperCase || !hasLowerCase || !hasDigit) {
            return res.status(400).json({
              error:
                "password must be at least 8 characters long and include uppercase letters, lowercase letters, and digits.",
            });
        }

        // hash password before storing in database
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        const result = await _createUser(email, username, hashedPassword);
    
        return res.status(201).json(result);
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'Failed to create user' });
    }
}

export async function getUserBySelf(req, res) {
    try {
        const { email } = req.user;

        const user = await _getUserByEmail(email);

        if (!user) {
            return res.status(404).json({ error: 'user not found' });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to retrieve user' });
    } 
}

export async function getUserByEmail(req, res) {
    try {
        const { email } = req.params;
        const user = await _getUserByEmail(email);

        if (!user) {
            return res.status(404).json({ error: 'user not found' });
        }
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to retrieve user' });
    }
}

export async function updateUser(req, res) {
    try {
        const { email } = req.user;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'username is required' });
        }
        
        const result = await _updateUser(email, username);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: 'Failed to update user' });
    }
}

export async function updateUserRoleByEmail(req, res) {
    try {
        const { email } = req.params;
        const { role } = req.body;

        if (!role || !email) {
            return res.status(400).json({ error: 'email and role are required' });
        }
        const validRoles = ['user', 'admin', 'root-admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'invalid role' });
        }
        const result = await _updateUserRoleByEmail(email, role);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error updating user role:', error);
        return res.status(500).json({ error: 'Failed to update user role' });
    }
}

export async function getAllUsers(req, res) {
    try {
        const users = await _getAllUsers();
        return res.status(200).json(users);
    } catch (error) {
        console.error('Error retrieving users:', error);
        return res.status(500).json({ error: 'Failed to retrieve users' });
    }
}


