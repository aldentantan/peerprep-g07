import express from 'express';
import multer from "multer";
import {
  createUser,
  getUserBySelf,
  updateUser,
  updateUserPassword,
  deleteUser,
  getUserByUsername,
  updateUserRoleByEmail,
  getAllUsers,
} from "../controllers/user-controller.js";
import {
  verifyAccessToken,
  verifyIsRootAdmin,
} from '../middleware/access-control.js';

const router = express.Router();

// Multer config for handling profile image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Public routes
router.post('/', createUser);

// Authenticated routes
router.get('/me', verifyAccessToken, getUserBySelf);

router.patch("/me/password", verifyAccessToken, updateUserPassword);

router.patch(
  "/me",
  verifyAccessToken,
  upload.single("profile_image"),
  updateUser,
);


router.delete("/me", verifyAccessToken, deleteUser);

router.get("/by-username/:username", verifyAccessToken, getUserByUsername);

// Admin-only routes
router.get('/all', verifyAccessToken, verifyIsRootAdmin, getAllUsers);

router.patch(
  '/:email/role',
  verifyAccessToken,
  verifyIsRootAdmin,
  updateUserRoleByEmail,
);

export default router;
