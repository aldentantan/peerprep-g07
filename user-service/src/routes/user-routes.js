import express from 'express';
import {
  createUser,
  getUserBySelf,
  updateUser,
  updateUserPassword,
  deleteUser,
  getUserByEmail,
  updateUserRoleByEmail,
  getAllUsers,
} from "../controllers/user-controller.js";
import {
  verifyAccessToken,
  verifyIsRootAdmin,
} from '../middleware/access-control.js';

const router = express.Router();

// Public routes
router.post('/', createUser);

// Authenticated routes
router.get('/me', verifyAccessToken, getUserBySelf);

router.patch("/me/password", verifyAccessToken, updateUserPassword);

router.patch('/me', verifyAccessToken, updateUser);


router.delete("/me", verifyAccessToken, deleteUser);

router.get('/by-email/:email', verifyAccessToken, getUserByEmail);

// Admin-only routes
router.get('/all', verifyAccessToken, verifyIsRootAdmin, getAllUsers);

router.patch(
  '/:email/role',
  verifyAccessToken,
  verifyIsRootAdmin,
  updateUserRoleByEmail,
);

export default router;
