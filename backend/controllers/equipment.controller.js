import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import { filterDataByRole } from "../middlewares/rbac.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Maps department to its corresponding equipment name field in the schema
 */
const DEPARTMENT_TO_FIELD_MAP = {
  FITTER_MANUFACTURING: 'fitterEquipmentName',
  ELECTRICAL_ENGINEERING: 'electricalEquipmentName',
  WELDING_FABRICATION: 'weldingEquipmentName',
  TOOL_DIE_MAKING: 'toolDieEquipmentName',
  ADDITIVE_MANUFACTURING: 'additiveManufacturingEquipmentName',
  SOLAR_INSTALLER_PV: 'solarInstallerEquipmentName',
  MATERIAL_TESTING_QUALITY: 'materialTestingEquipmentName',
  ADVANCED_MANUFACTURING_CNC: 'advancedManufacturingEquipmentName',
  AUTOMOTIVE_MECHANIC: 'automotiveEquipmentName',
};

/**
 * Helper to build department-specific equipment name field
 */
const buildDepartmentField = (department, equipmentName) => {
  const fieldName = DEPARTMENT_TO_FIELD_MAP[department];
  if (!fieldName || !equipmentName) {
    return {};
  }
  return { [fieldName]: equipmentName };
};

/**
 * Helper to clear all department-specific fields
 */
const clearAllDepartmentFields = () => {
  const clearFields = {};
  Object.values(DEPARTMENT_TO_FIELD_MAP).forEach(field => {
    clearFields[field] = null;
  });
  return clearFields;
};

class EquipmentController {
  // Get all equipment
// FIXED getAllEquipment method - Replace lines 44-119 in equipment.controller.js

getAllEquipment = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    department,
    status,
    institute,
    labId,
    search,
  } = req.query;
  const skip = (page - 1) * limit;

  // Get the base filter from RBAC
  const roleFilter = filterDataByRole(req);

  // Build where clause for equipment
  const where = {
    ...roleFilter,
    ...(roleFilter?.labId ? {} : { labId: { not: null } }),
    ...(department && { department }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { equipmentId: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
      ],
    }),
    isActive: true,
  };

  // Add lab filter if provided
  if (labId && req.user.role !== "TRAINER") {
    const lab = await prisma.lab.findUnique({ where: { labId } });
    if (lab) {
      where.labId = lab.id;
    }
  }

  // Add institute filter
  if (req.user.role !== "TRAINER" && institute) {
    where.lab = { 
      ...(where.lab || {}), 
      institute 
    };
  }

  // ✅ FIXED: Filter by status through the relation
  if (status) {
    where.status = {
      status: status  // Filter the related status record
    };
  }

  try {
    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          status: true,  // Include all status data
          lab: { 
            select: { 
              labId: true,
              name: true, 
              institute: true,
              department: true,
            } 
          },
          _count: {
            select: {
              alerts: { where: { isResolved: false } },
              maintenanceLogs: true,
            },
          },
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.equipment.count({ where }),
    ]);

    res.json({
      success: true,
      data: equipment,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error in getAllEquipment:', error);
    throw error;
  }
});


  // Get equipment by ID
  getEquipmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const roleFilter = filterDataByRole(req);

    const equipment = await prisma.equipment.findFirst({
      where: { id, ...roleFilter, isActive: true },
      include: {
        status: true,
        lab: { 
          select: { 
            labId: true,  // Public labId
            name: true, 
            institute: true,
            department: true,
          } 
        },
        alerts: {
          where: { isResolved: false },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        maintenanceLogs: {
          orderBy: { scheduledDate: "desc" },
          take: 5,
          include: {
            technician: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        usageAnalytics: {
          orderBy: { date: "desc" },
          take: 7,
        },
        analyticsParams: true, // Include department analytics
      },
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or access denied.",
      });
    }

    res.json({
      success: true,
      data: equipment,
    });
  });

  // Create new equipment
  createEquipment = asyncHandler(async (req, res) => {
    const {
      equipmentId,
      name,
      department,
      equipmentName, // Department-specific equipment name enum
      manufacturer,
      model,
      serialNumber,
      purchaseDate,
      warrantyExpiry,
      labId, // Public string labId
      specifications,
      imageUrl,
    } = req.body;

    // Validate equipment ID uniqueness
    const existing = await prisma.equipment.findUnique({
      where: { equipmentId },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Equipment ID already exists.",
      });
    }

    // Validate and translate labId
    if (!labId) {
      return res.status(400).json({ 
        success: false, 
        message: "labId is required." 
      });
    }

    const lab = await prisma.lab.findUnique({ 
      where: { labId: labId.trim() } 
    });

    if (!lab) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid Lab ID provided: "${labId}". Please check and try again.` 
      });
    }

    // Security check: LAB_MANAGER can only add to their own institute
    if (req.user.role === "LAB_MANAGER") {
      if (lab.institute !== req.user.institute) {
        return res.status(403).json({
          success: false,
          message: "You can only add equipment to your own institute.",
        });
      }
      
      // LAB_MANAGER can only add to their department
      if (lab.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: "You can only add equipment to labs in your department.",
        });
      }
    }

    // Validate department matches lab department
    if (department !== lab.department) {
      return res.status(400).json({
        success: false,
        message: `Equipment department must match lab department (${lab.department}).`,
      });
    }

    // Build department-specific field
    const departmentField = buildDepartmentField(department, equipmentName);

    // Create equipment with status
    const equipment = await prisma.equipment.create({
      data: {
        equipmentId,
        name,
        department,
        ...departmentField, // Add department-specific equipment name
        manufacturer,
        model,
        serialNumber: serialNumber || null,
        purchaseDate: new Date(purchaseDate),
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        labId: lab.id, // Use internal ObjectId
        specifications: specifications || null,
        imageUrl: imageUrl || null,
        isActive: true,
        status: {
          create: {
            status: "IDLE",
            healthScore: 100,
            isOperatingInClass: false,
          },
        },
      },
      include: {
        status: true,
        lab: {
          select: {
            labId: true,
            name: true,
            institute: true,
            department: true,
          },
        },
      },
    });

    logger.info(`Equipment created: ${equipmentId} by ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: "Equipment created successfully.",
      data: equipment,
    });
  });

  // Update equipment
  updateEquipment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      department, 
      equipmentName, 
      labId, 
      purchaseDate,
      warrantyExpiry,
      ...updateData 
    } = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.equipmentId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.isActive;

    // Check if equipment exists and user has access
    const roleFilter = filterDataByRole(req);
    const existingEquipment = await prisma.equipment.findFirst({
      where: { id, ...roleFilter, isActive: true },
      include: { lab: true },
    });

    if (!existingEquipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or access denied.",
      });
    }

    // Handle department change
    if (department && department !== existingEquipment.department) {
      // Clear all department-specific fields first
      Object.assign(updateData, clearAllDepartmentFields());
      
      // Set new department
      updateData.department = department;
      
      // Set new department-specific equipment name if provided
      if (equipmentName) {
        Object.assign(updateData, buildDepartmentField(department, equipmentName));
      }
    } else if (equipmentName) {
      // Just updating equipment name for same department
      Object.assign(
        updateData, 
        buildDepartmentField(existingEquipment.department, equipmentName)
      );
    }

    // Handle lab change
    if (labId && labId !== existingEquipment.lab.labId) {
      const newLab = await prisma.lab.findUnique({ 
        where: { labId: labId.trim() } 
      });

      if (!newLab) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid Lab ID: "${labId}".` 
        });
      }

      // Security check for LAB_MANAGER
      if (req.user.role === "LAB_MANAGER") {
        if (newLab.institute !== req.user.institute) {
          return res.status(403).json({
            success: false,
            message: "You can only move equipment within your own institute.",
          });
        }
        
        if (newLab.department !== req.user.department) {
          return res.status(403).json({
            success: false,
            message: "You can only move equipment to labs in your department.",
          });
        }
      }

      // Validate department matches new lab
      const targetDepartment = updateData.department || existingEquipment.department;
      if (targetDepartment !== newLab.department) {
        return res.status(400).json({
          success: false,
          message: `Cannot move equipment to lab in different department. Equipment is ${targetDepartment}, lab is ${newLab.department}.`,
        });
      }

      updateData.labId = newLab.id; // Use internal ObjectId
    }

    // Handle date conversions
    if (purchaseDate) {
      updateData.purchaseDate = new Date(purchaseDate);
    }
    if (warrantyExpiry) {
      updateData.warrantyExpiry = new Date(warrantyExpiry);
    }

    // Update equipment
    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData,
      include: {
        status: true,
        lab: {
          select: {
            labId: true,
            name: true,
            institute: true,
            department: true,
          },
        },
      },
    });

    logger.info(`Equipment updated: ${equipment.equipmentId} by ${req.user.email}`);
    res.json({
      success: true,
      message: "Equipment updated successfully.",
      data: equipment,
    });
  });

  // Delete equipment (soft delete)
  deleteEquipment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check access first
    const roleFilter = filterDataByRole(req);
    const equipment = await prisma.equipment.findFirst({
      where: { id, ...roleFilter, isActive: true },
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or access denied.",
      });
    }

    // Soft delete
    await prisma.equipment.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Equipment deleted: ${equipment.equipmentId} by ${req.user.email}`);
    res.json({
      success: true,
      message: "Equipment deleted successfully.",
    });
  });

  // Get equipment statistics
  getEquipmentStats = asyncHandler(async (req, res) => {
    const roleFilter = filterDataByRole(req);

    // Build where clause for stats - FIXED: Same fix as getAllEquipment
    const statsWhere = {
      ...roleFilter,
      // Only add "not null" check if roleFilter doesn't have a specific labId
     ...(roleFilter?.labId ? {} : { labId: { not: null } }),
      isActive: true,
    };

    const [total, byStatus, byDepartment, criticalAlerts] = await Promise.all([
      // Total equipment count
      prisma.equipment.count({ 
        where: statsWhere
      }),

      // Count by status
      prisma.equipmentStatus.groupBy({
        by: ["status"],
        where: { 
          equipment: statsWhere
        },
        _count: true,
      }),

      // Count by department
      prisma.equipment.groupBy({
        by: ["department"],
        where: statsWhere,
        _count: true,
      }),

      // Critical unresolved alerts
      prisma.alert.count({
        where: {
          equipment: statsWhere,
          isResolved: false,
          severity: { in: ["CRITICAL", "HIGH"] },
        },
      }),
    ]);

    // Format status counts
    const statusCounts = byStatus.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total,
        byStatus: {
          OPERATIONAL: statusCounts.OPERATIONAL || 0,
          IN_USE: statusCounts.IN_USE || 0,
          IN_CLASS: statusCounts.IN_CLASS || 0,
          IDLE: statusCounts.IDLE || 0,
          MAINTENANCE: statusCounts.MAINTENANCE || 0,
          FAULTY: statusCounts.FAULTY || 0,
          OFFLINE: statusCounts.OFFLINE || 0,
          WARNING: statusCounts.WARNING || 0,
        },
        byDepartment: byDepartment.map((d) => ({
          department: d.department,
          count: d._count,
        })),
        criticalAlerts,
      },
    });
  });
}

export default new EquipmentController();