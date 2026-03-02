import express from 'express';
import { createUser,
    getUserBySelf,
    updateUser,
    getUserByEmail,
    updateUserRoleByEmail,
 } from '../controllers/user-controller.js';
import { verifyAccessToken, verifyIsRootAdmin } from '../middleware/access-control.js';

const router = express.Router();

router.post('/', createUser);

router.get('/me', verifyAccessToken, getUserBySelf);

router.patch('/me', verifyAccessToken, updateUser);

router.get("/by-email/:email", verifyAccessToken, verifyIsRootAdmin, getUserByEmail);

router.patch("/:email/role", verifyAccessToken, verifyIsRootAdmin, updateUserRoleByEmail);


export default router;
