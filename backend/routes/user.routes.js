import express from 'express';
import userController from '../controllers/user.controller.js';
import authMiddleware from '../middlewares/auth.js';
import { can } from '../middlewares/rbac.js';
import {
  createUserValidation,
  updateUserValidation,
} from '../middlewares/validation.js';

const router = express.Router();

// All user management routes require authentication and manager role
router.use(authMiddleware);
router.use(can.manageUsers);

// Get all users
router.get('/', userController.getAllUsers);

// --- NEW ROUTE ---
// Get all users for a specific institute
router.get('/institute/:institute', userController.getUsersByInstitute);

// Create a new user
router.post('/', createUserValidation, userController.createUser);

// Get a single user by ID
router.get('/:id', userController.getUserById);

// Update a user
router.put('/:id', updateUserValidation, userController.updateUser);

// Deactivate/Reactivate a user
router.patch('/:id/status', userController.setUserStatus);

export default router;