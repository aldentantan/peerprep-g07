import {query} from '../database/db.js';

export async function createUser(email, username, hashedPassword) {
    const result = await query(
        'INSERT INTO users (email, username, hashed_password) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
        [email, username, hashedPassword],
    );
    return result.rows[0];
}

export async function createRootAdminUser(email, username, hashedPassword) {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        return existingUser;
    }
    const result = await query(
        'INSERT INTO users (email, username, hashed_password, access_role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, access_role, created_at',
        [email, username, hashedPassword, 'root-admin'],
    );
    return result.rows[0];
}

export async function getUserByEmail(email) {
    const result = await query(
        'SELECT id, email, username, hashed_password, access_role, created_at FROM users WHERE email = $1',
        [email],
    );
    return result.rows[0];
}

export async function updateUser(email, username) {
    const result = await query(
        'UPDATE users SET username = $1 WHERE email = $2 RETURNING id, email, username, created_at',
        [username, email],
    );
    return result.rows[0];
}

export async function updateUserRoleByEmail(email, role) {
    const result = await query(
        'UPDATE users SET access_role = $1 WHERE email = $2 RETURNING id, email, username, access_role, created_at',
        [role, email],        
    );
    return result.rows[0];
}

export async function getAllUsers() {
    const result = await query(
        'SELECT id, email, username, access_role, created_at FROM users ORDER BY created_at DESC',
        [],
    );
    return result.rows;
}