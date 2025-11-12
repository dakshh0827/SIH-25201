import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class UserController {
  // Get all users (remains the same, useful for admin lists)
  getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, institute, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(role && { role }),
      ...(institute && { institute }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          institute: true,
          isActive: true,
          createdAt: true,
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // --- NEW FUNCTION ---
  /**
   * Gets all users for a specific institute.
   * Used by Policy Makers to "drill down" into an institution.
   */
  getUsersByInstitute = asyncHandler(async (req, res) => {
    const { institute } = req.params;
    const { page = 1, limit = 50, role } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      institute: institute, // The institute name from the URL
      ...(role && { role }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { role: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Get user by ID
  getUserById = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        institute: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  });

  // Create new user
  createUser = asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, role, phone, institute } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        phone,
        institute,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        institute: true,
        createdAt: true,
      },
    });

    logger.info(`User created by ${req.user.email}: ${user.email}`);
    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: user,
    });
  });

  // Update user
  updateUser = asyncHandler(async (req, res) => {
    const { email, firstName, lastName, role, phone, institute, isActive } = req.body;

    const dataToUpdate = {
      email,
      firstName,
      lastName,
      role,
      phone,
      institute,
      isActive,
    };
    
    // Remove undefined fields
    Object.keys(dataToUpdate).forEach(
      (key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
    );

    try {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: dataToUpdate,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          institute: true,
          isActive: true,
        },
      });
      logger.info(`User updated by ${req.user.email}: ${user.email}`);
      res.json({
        success: true,
        message: 'User updated successfully.',
        data: user,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Email already in use.' });
      }
      throw error;
    }
  });

  // Set user status
  setUserStatus = asyncHandler(async (req, res) => {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean.' });
    }

    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id && !isActive) {
      return res.status(403).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });

    logger.info(`User status changed by ${req.user.email} for ${user.email}: ${user.isActive}`);
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'}.`,
      data: user,
    });
  });
}

export default new UserController();