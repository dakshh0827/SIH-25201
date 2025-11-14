import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { jwtConfig } from "../config/jwt.js";
import {
  USER_ROLE_ENUM,
  OTP_PURPOSE_ENUM,
  AUTH_PROVIDER_ENUM,
  DEPARTMENT_ENUM, // --- FIX: Import DEPARTMENT_ENUM
} from "../utils/constants.js";
import EmailService from "../utils/emailService.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const generateAccessToken = (user) => {
  const payload = {
    userId: user.id || user.userId,
    email: user.email,
    role: user.role,
    instituteId: user.instituteId,
    department: user.department,
    labId: user.labId,
    authProvider: user.authProvider, // --- FIX: Add authProvider to JWT
  };
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};

const generateRefreshToken = (user) => {
  const payload = {
    userId: user.id || user.userId,
  };
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
};

class AuthController {
  register = asyncHandler(async (req, res, next) => {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
      instituteId,
      department,
      labId,
    } = req.body;

    // Validate role is a valid UserRole enum value
    // --- FIX: Use USER_ROLE_ENUM from constants ---
    const validRoles = Object.values(USER_ROLE_ENUM);
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    let existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser && existingUser.emailVerified) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    // Lab ID translation for Trainers and Lab Managers
    let labInternalId = null;
    if (role === 'TRAINER' || role === 'LAB_MANAGER') {
      if (!labId) {
        return res.status(400).json({
          success: false,
          message: "labId is required for this role.",
        });
      }

      const lab = await prisma.lab.findFirst({
        where: {
          labId: { equals: labId.trim(), mode: "insensitive" },
          instituteId: instituteId,
          department: department,
        },
      });

      if (!lab) {
        logger.error(
          `Lab not found with matching labId: "${labId}", institute: "${instituteId}", department: "${department}"`
        );
        return res.status(400).json({
          success: false,
          message: `Invalid Lab ID or it does not match the selected Institute/Department.`,
        });
      }

      labInternalId = lab.id;
      logger.info(`Lab found: ${lab.name} (ID: ${lab.id})`);
    }

    // Validate role-specific requirements
    if (role === 'LAB_MANAGER' || role === 'TRAINER') {
      if (!instituteId || !department) {
        return res.status(400).json({
          success: false,
          message: "Institute and Department are required for this role.",
        });
      }
      
      // Validate department enum
      // --- FIX: Use DEPARTMENT_ENUM from constants ---
      const validDepartments = Object.values(DEPARTMENT_ENUM);
      
      if (!validDepartments.includes(department)) {
        return res.status(400).json({
          success: false,
          message: `Invalid department. Must be one of: ${validDepartments.join(', ')}`,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Build base user data with proper null handling
    const baseUserData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'TRAINER',
      phone: phone || null,
      department: (role === 'LAB_MANAGER' || role === 'TRAINER') ? department : null,
      instituteId: (role === 'LAB_MANAGER' || role === 'TRAINER') ? instituteId : null,
      labId: labInternalId,
      emailVerified: false,
      authProvider: 'CREDENTIAL',
    };

    const user = await prisma.user.upsert({
      where: { email },
      update: baseUserData,
      create: baseUserData,
    });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.updateMany({
      where: { email, purpose: 'REGISTRATION', isUsed: false },
      data: { isUsed: true },
    });

    await prisma.oTP.create({
      data: {
        email,
        otp,
        purpose: 'REGISTRATION',
        expiresAt,
      },
    });

    EmailService.sendMail(email, otp).catch((err) =>
      logger.error("Failed to send OTP email:", err)
    );

    logger.info(`New user registration initiated: ${email}. OTP sent.`);
    res.status(201).json({
      success: true,
      message:
        "Registration successful. An OTP has been sent to your email for verification.",
      requiresVerification: true,
      data: {
        email: user.email,
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  });

  verifyEmail = asyncHandler(async (req, res, next) => {
    const { email, otp, purpose = 'REGISTRATION' } = req.body;

    const validOtp = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        purpose,
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
    }

    await prisma.oTP.update({
      where: { id: validOtp.id },
      data: { isUsed: true },
    });

    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        instituteId: true,
        authProvider: true, // --- FIX: Add authProvider
        institute: {
          select: {
            instituteId: true,
            name: true,
          },
        },
        department: true,
        labId: true,
        lab: { select: { labId: true, name: true } },
      },
    });

    EmailService.sendWelcomeEmail(email, user.firstName).catch((err) =>
      logger.error("Failed to send welcome email:", err)
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info(`Email verified for user: ${email}`);
    res.json({
      success: true,
      message: "Email verified successfully. You are now logged in.",
      data: {
        accessToken,
        user,
      },
    });
  });

  resendOtp = asyncHandler(async (req, res, next) => {
    const { email, purpose = 'REGISTRATION' } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (purpose === 'REGISTRATION' && user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified.",
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.updateMany({
      where: { email, purpose, isUsed: false },
      data: { isUsed: true },
    });

    await prisma.oTP.create({
      data: { email, otp, purpose, expiresAt },
    });

    EmailService.sendMail(email, otp).catch((err) =>
      logger.error("Failed to send OTP email:", err)
    );

    logger.info(`Resent OTP for: ${email}. Purpose: ${purpose}`);
    res.json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  });

  login = asyncHandler(async (req, res, next) => {
    const { email, password, requireOtp = false } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // --- FIX: Check if authProvider exists AND is not CREDENTIAL ---
    // This allows legacy users (where authProvider is null) to log in.
    if (user.authProvider && user.authProvider !== 'CREDENTIAL') {
      return res.status(401).json({
        success: false,
        message: `This account is registered with ${user.authProvider}. Please log in using that method.`,
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please check your inbox for an OTP.",
        requiresVerification: true,
        data: { emailVerified: false },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact administrator.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (requireOtp) {
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.oTP.updateMany({
        where: { email, purpose: 'LOGIN', isUsed: false },
        data: { isUsed: true },
      });

      await prisma.oTP.create({
        data: { email, otp, purpose: 'LOGIN', expiresAt },
      });

      EmailService.sendOtpEmail(email, otp).catch((err) =>
        logger.error("Failed to send OTP email:", err)
      );

      logger.info(`Login OTP sent to: ${email}`);
      return res.json({
        success: true,
        message: "OTP sent to your email. Please verify to complete login.",
        requiresOTP: true,
      });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      instituteId: user.instituteId,
      department: user.department,
      labId: user.labId,
      authProvider: user.authProvider, // --- FIX: Add authProvider
    };

    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info(`User logged in: ${email}`);
    res.json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken,
        user: userPayload,
      },
    });
  });

  completeLogin = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    const validOtp = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        purpose: 'LOGIN',
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
    }

    await prisma.oTP.update({
      where: { id: validOtp.id },
      data: { isUsed: true },
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        instituteId: true,
        department: true,
        labId: true,
        authProvider: true, // --- FIX: Add authProvider
      },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info(`User logged in via OTP: ${email}`);
    res.json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken,
        user,
      },
    });
  });

  oauthCallback = asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=authentication_failed`
      );
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info(
      `User logged in via OAuth (${user.authProvider}): ${user.email}`
    );

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`
    );
  });

  googleAuth = (req, res) => {
    logger.debug("Redirecting to Google for authentication...");
  };

  githubAuth = (req, res) => {
    logger.debug("Redirecting to GitHub for authentication...");
  };

  getProfile = asyncHandler(async (req, res) => {
  // Make sure req.user exists and has the userId
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      instituteId: true,
      institute: {
        select: {
          instituteId: true,
          name: true,
        },
      },
      department: true,
      labId: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      authProvider: true, // --- FIX: Add authProvider
      lab: {
        select: {
          labId: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  res.json({
    success: true,
    data: user,
  });
});

  updateProfile = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        instituteId: true,
        department: true,
        labId: true,
        authProvider: true, // --- FIX: Add authProvider
      },
    });

    logger.info(`Profile updated: ${req.user.email}`);
    res.json({
      success: true,
      message: "Profile updated successfully.",
      data: user,
    });
  });

  changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Cannot change password for OAuth accounts.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    logger.info(`Password changed: ${req.user.email}`);
    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  });

  refreshToken = asyncHandler(async (req, res, next) => {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No refresh token provided." });
    }

    let payload;
    try {
      payload = jwt.verify(token, jwtConfig.refreshSecret);
    } catch (err) {
      logger.warn("Invalid refresh token received:", err.message);
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        instituteId: true,
        department: true,
        labId: true,
        isActive: true,
        authProvider: true, // --- FIX: Add authProvider
      },
    });

    if (!user || !user.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "User not found or deactivated." });
    }

    const userPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      instituteId: user.instituteId,
      department: user.department,
      labId: user.labId,
      authProvider: user.authProvider, // --- FIX: Add authProvider
    };
    const accessToken = generateAccessToken(userPayload);

    res.json({
      success: true,
      message: "Access token refreshed.",
      data: {
        accessToken,
      },
    });
  });

  logout = asyncHandler(async (req, res, next) => {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  });
}

export default new AuthController();