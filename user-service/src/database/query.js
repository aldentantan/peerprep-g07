import { query } from '../database/db.js';

export async function createUser(email, username, hashedPassword) {
  const result = await query(
    "INSERT INTO users (email, username, hashed_password) VALUES ($1, $2, $3) RETURNING id, email, username, preferred_language, topics_of_interest, created_at",
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
    "INSERT INTO users (email, username, hashed_password, access_role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, preferred_language, topics_of_interest, access_role, created_at",
    [email, username, hashedPassword, "root-admin"],
  );
  return result.rows[0];
}

export async function getUserByEmail(email) {
  const result = await query(
    "SELECT id, email, username, hashed_password, preferred_language, topics_of_interest, access_role, created_at FROM users WHERE email = $1",
    [email],
  );
  return result.rows[0];
}

export async function getUserById(id) {
  const result = await query(
    'SELECT id, email, username, access_role, created_at FROM users WHERE id = $1',
    [id],
  );
  return result.rows[0];
}

export async function updateUser(
  email,
  username,
  preferred_language,
  topics_of_interest,
) {
  const result = await query(
    "UPDATE users SET username = $1, preferred_language = $2, topics_of_interest = $3 WHERE email = $4 RETURNING id, email, username, preferred_language, topics_of_interest, created_at",
    [username, preferred_language, topics_of_interest, email],
  );
  return result.rows[0];
}

export async function updateUserPassword(email, hashedPassword) {
  const result = await query(
    "UPDATE users SET hashed_password = $1 WHERE email = $2 RETURNING id, email, username, preferred_language, topics_of_interest, created_at",
    [hashedPassword, email],
  );
  return result.rows[0];
}

export async function deleteUserByEmail(email) {
  const result = await query(
    "DELETE FROM users WHERE email = $1 RETURNING id, email, username, access_role, created_at",
    [email],
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
