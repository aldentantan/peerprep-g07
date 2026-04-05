import {
  createUser as _createUser,
  getUserByEmail as _getUserByEmail,
  getUserById as _getUserById,
  updateUser as _updateUser,
  updateUserPassword as _updateUserPassword,
  deleteUserByEmail as _deleteUserByEmail,
  updateUserRoleByEmail as _updateUserRoleByEmail,
  getAllUsers as _getAllUsers,
} from "../database/query.js";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { mapUserToView } from '../utils/view.js';

export async function createUser(req, res) {
  try {
    console.log(req.body);
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res
        .status(400)
        .json({ error: 'Email, username, and password are required' });
    }

    // Check if email already exists
    const existingUser = await _getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // check if password is valid
    const isMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);

    if (!isMinLength || !hasUpperCase || !hasLowerCase || !hasDigit) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and include uppercase letters, lowercase letters, and digits',
      });
    }

    // hash password before storing in database
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const result = await _createUser(email, username, hashedPassword);

    return res.status(201).json(mapUserToView(result));
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
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(mapUserToView(user));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve user' });
  }
}

export async function getUserByEmail(req, res) {
  try {
    const { email } = req.params;
    const user = await _getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(mapUserToView(user));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve user' });
  }
}

export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await _getUserById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(mapUserToView(user));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve user' });
  }
}

export async function updateUser(req, res) {
  try {
    const { email } = req.user;
    const { username, preferred_language, topics_of_interest } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const result = await _updateUser(
      email,
      username,
      preferred_language,
      topics_of_interest,
    );

    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = mapUserToView(result);
    const token = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3d" },
    );

    return res.status(200).json({ ...updatedUser, token });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

export async function updateUserPassword(req, res) {
  try {
    const { email } = req.user;
    const { new_password, current_password } = req.body;

    if (!new_password || !current_password) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    const user = await _getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordMatch = bcrypt.compareSync(
      current_password,
      user.hashed_password,
    );
    if (!passwordMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // check if new password is valid
    const isMinLength = new_password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(new_password);
    const hasLowerCase = /[a-z]/.test(new_password);
    const hasDigit = /\d/.test(new_password);

    if (!isMinLength || !hasUpperCase || !hasLowerCase || !hasDigit) {
      return res.status(400).json({
        error:
          "New password must be at least 8 characters long and include uppercase letters, lowercase letters, and digits",
      });
    }

    // hash new password before storing in database
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(new_password, salt);

    const result = await _updateUserPassword(email, hashedPassword);
    return res.status(200).json(mapUserToView(result));
  } catch (error) {
    console.error("Error updating user password:", error);
    return res.status(500).json({ error: "Failed to update user password" });
  }
}

export async function deleteUser(req, res) {
  try {
    const { email, role } = req.user;
    if (role == "root-admin") {
      return res
        .status(403)
        .json({ error: "Forbidden: cannot delete root-admin user" });
    }

    const result = await _deleteUserByEmail(email);
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(mapUserToView(result));
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
}

export async function updateUserRoleByEmail(req, res) {
  try {
    const { email } = req.params;
    const { role } = req.body;

    if (!role || !email) {
      return res.status(400).json({ error: 'Email and role are required' });
    }
    const validRoles = ['user', 'admin', 'root-admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const result = await _updateUserRoleByEmail(email, role);
    return res.status(200).json(mapUserToView(result));
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
}

export async function getAllUsers(req, res) {
  try {
    const users = await _getAllUsers();
    return res.status(200).json(users.map(mapUserToView));
  } catch (error) {
    console.error('Error retrieving users:', error);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
}
