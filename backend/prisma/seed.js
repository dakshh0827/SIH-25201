import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Import enums from your constants file
// Make sure the path is correct relative to this seed file
import {
  DEPARTMENT_ENUM,
  USER_ROLE_ENUM,
  OPERATIONAL_STATUS,
  ALERT_TYPE,
  ALERT_SEVERITY,
  MAINTENANCE_TYPE,
  REPORT_TYPE,
  NOTIFICATION_TYPE,
} from "../utils/constants.js";

const prisma = new PrismaClient();

/**
 * Generates a random integer between min (inclusive) and max (inclusive)
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates random float between min (inclusive) and max (exclusive) with fixed decimal places
 */
function getRandomFloat(min, max, decimals = 2) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

/**
 * Subtracts days from a given date
 */
function subDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

async function main() {
  console.log("Seeding started...");

  // 1. =================== CLEAN DATABASE ===================
  // We must delete in the reverse order of creation to respect foreign key constraints.
  console.log("Cleaning database...");
  await prisma.report.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.usageAnalytics.deleteMany();
  await prisma.departmentAnalytics.deleteMany();
  await prisma.sensorData.deleteMany();
  await prisma.equipmentStatus.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.lab.deleteMany();
  await prisma.institute.deleteMany();
  await prisma.oTP.deleteMany();
  await prisma.systemConfig.deleteMany();
  console.log("Database cleaned.");

  // 2. =================== HASH PASSWORD ===================
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 3. =================== CREATE INSTITUTES ===================
  console.log("Creating institutes...");
  const itiPusa = await prisma.institute.create({
    data: {
      instituteId: "ITI_PUSA",
      name: "ITI Pusa, New Delhi",
    },
  });

  const atiMumbai = await prisma.institute.create({
    data: {
      instituteId: "ATI_MUMBAI",
      name: "ATI Mumbai",
    },
  });

  // 4. =================== CREATE LABS ===================
  console.log("Creating labs...");
  const pusaFitterLab = await prisma.lab.create({
    data: {
      labId: "ITI_PUSA_FITTER_01",
      name: "Fitter Workshop 01",
      instituteId: itiPusa.instituteId,
      department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
    },
  });

  const pusaElectricalLab = await prisma.lab.create({
    data: {
      labId: "ITI_PUSA_ELEC_01",
      name: "Electrical Lab 01",
      instituteId: itiPusa.instituteId,
      department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
    },
  });

  const mumbaiCncLab = await prisma.lab.create({
    data: {
      labId: "ATI_MUMBAI_CNC_01",
      name: "Advanced CNC Lab",
      instituteId: atiMumbai.instituteId,
      department: DEPARTMENT_ENUM.ADVANCED_MANUFACTURING_CNC,
    },
  });

  const mumbaiWeldingLab = await prisma.lab.create({
    data: {
      labId: "ATI_MUMBAI_WELD_01",
      name: "Welding & Fabrication Workshop",
      instituteId: atiMumbai.instituteId,
      department: DEPARTMENT_ENUM.WELDING_FABRICATION,
    },
  });

  // 5. =================== CREATE USERS ===================
  console.log("Creating users...");

  // --- Policy Maker ---
  const policyMakerEmail = "policy.maker@gov.in";
  const policyMaker = await prisma.user.create({
    data: {
      email: policyMakerEmail,
      password: hashedPassword,
      firstName: "Policy",
      lastName: "Maker",
      role: USER_ROLE_ENUM.POLICY_MAKER,
      emailVerified: true,
      isActive: true,
      authProvider: "CREDENTIAL",
      // --- FIX: Add unique, non-null values to satisfy unique index ---
      googleId: `cred_${policyMakerEmail}`,
      githubId: `cred_${policyMakerEmail}`,
    },
  });

  // --- ITI Pusa Users ---
  const pusaFitterManagerEmail = "manager.pusa.fitter@iti.in";
  const pusaFitterManager = await prisma.user.create({
    data: {
      email: pusaFitterManagerEmail,
      password: hashedPassword,
      firstName: "Fitter",
      lastName: "Manager (Pusa)",
      role: USER_ROLE_ENUM.LAB_MANAGER,
      emailVerified: true,
      isActive: true,
      instituteId: itiPusa.instituteId,
      department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
      labId: pusaFitterLab.id, // Internal ObjectId
      authProvider: "CREDENTIAL",
      // --- FIX: Add unique, non-null values ---
      googleId: `cred_${pusaFitterManagerEmail}`,
      githubId: `cred_${pusaFitterManagerEmail}`,
    },
  });

  const pusaFitterTrainer1Email = "trainer1.pusa.fitter@iti.in";
  const pusaFitterTrainer1 = await prisma.user.create({
    data: {
      email: pusaFitterTrainer1Email,
      password: hashedPassword,
      firstName: "Fitter",
      lastName: "Trainer 1",
      role: USER_ROLE_ENUM.TRAINER,
      emailVerified: true,
      isActive: true,
      instituteId: itiPusa.instituteId,
      department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
      labId: pusaFitterLab.id,
      authProvider: "CREDENTIAL",
      // --- FIX: Add unique, non-null values ---
      googleId: `cred_${pusaFitterTrainer1Email}`,
      githubId: `cred_${pusaFitterTrainer1Email}`,
    },
  });

  const pusaElectricalManagerEmail = "manager.pusa.elec@iti.in";
  const pusaElectricalManager = await prisma.user.create({
    data: {
      email: pusaElectricalManagerEmail,
      password: hashedPassword,
      firstName: "Electrical",
      lastName: "Manager (Pusa)",
      role: USER_ROLE_ENUM.LAB_MANAGER,
      emailVerified: true,
      isActive: true,
      instituteId: itiPusa.instituteId,
      department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
      labId: pusaElectricalLab.id,
      authProvider: "CREDENTIAL",
      // --- FIX: Add unique, non-null values ---
      googleId: `cred_${pusaElectricalManagerEmail}`,
      githubId: `cred_${pusaElectricalManagerEmail}`,
    },
  });

  const pusaElectricalTrainer1Email = "trainer1.pusa.elec@iti.in";
  const pusaElectricalTrainer1 = await prisma.user.create({
    data: {
      email: pusaElectricalTrainer1Email,
      password: hashedPassword,
      firstName: "Electrical",
      lastName: "Trainer 1",
      role: USER_ROLE_ENUM.TRAINER,
      emailVerified: true,
      isActive: true,
      instituteId: itiPusa.instituteId,
      department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
      labId: pusaElectricalLab.id,
      authProvider: "CREDENTIAL",
      // --- FIX: Add unique, non-null values ---
      googleId: `cred_${pusaElectricalTrainer1Email}`,
      githubId: `cred_${pusaElectricalTrainer1Email}`,
    },
  });

  // --- ATI Mumbai Users ---
  const mumbaiCncManagerEmail = "manager.mumbai.cnc@ati.in";
  const mumbaiCncManager = await prisma.user.create({
    data: {
      email: mumbaiCncManagerEmail,
      password: hashedPassword,
      firstName: "CNC",
      lastName: "Manager (Mumbai)",
      role: USER_ROLE_ENUM.LAB_MANAGER,
      emailVerified: true,
      isActive: true,
      instituteId: atiMumbai.instituteId,
      department: DEPARTMENT_ENUM.ADVANCED_MANUFACTURING_CNC,
      labId: mumbaiCncLab.id,
      authProvider: "CREDENTIAL",
      // --- FIX: Add unique, non-null values ---
      googleId: `cred_${mumbaiCncManagerEmail}`,
      githubId: `cred_${mumbaiCncManagerEmail}`,
    },
  });

  const mumbaiCncTrainer1Email = "trainer1.mumbai.cnc@ati.in";
  const mumbaiCncTrainer1 = await prisma.user.create({
    data: {
      email: mumbaiCncTrainer1Email,
      password: hashedPassword,
      firstName: "CNC",
      lastName: "Trainer 1",
      role: USER_ROLE_ENUM.TRAINER,
      emailVerified: true,
      isActive: true,
      instituteId: atiMumbai.instituteId,
      department: DEPARTMENT_ENUM.ADVANCED_MANUFACTURING_CNC,
      labId: mumbaiCncLab.id,
      authProvider: "CREDENTIAL",
      // --- FIX: Add unique, non-null values ---
      googleId: `cred_${mumbaiCncTrainer1Email}`,
      githubId: `cred_${mumbaiCncTrainer1Email}`,
    },
  });

  // Group users for notifications
  const pusaFitterUsers = [pusaFitterManager.id, pusaFitterTrainer1.id];
  const pusaElectricalUsers = [
    pusaElectricalManager.id,
    pusaElectricalTrainer1.id,
  ];
  const mumbaiCncUsers = [mumbaiCncManager.id, mumbaiCncTrainer1.id];

  // 6. =================== CREATE EQUIPMENT ===================
  console.log("Creating equipment with related data...");

  // --- Pusa Fitter Lab Equipment (3) ---
  const fitterEquip1 = await prisma.equipment.create({
    data: {
      equipmentId: "ITI_PUSA_FIT_001",
      name: "Bench Drilling Machine",
      department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
      fitterEquipmentName: "BENCH_DRILLING_MACHINE",
      labId: pusaFitterLab.id,
      manufacturer: "Bosch",
      model: "GBM 13 RE",
      purchaseDate: subDays(new Date(), 400),
      warrantyExpiry: subDays(new Date(), 35),
      status: {
        create: {
          status: OPERATIONAL_STATUS.OPERATIONAL,
          healthScore: 92.5,
          lastMaintenanceDate: subDays(new Date(), 20),
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
          temperature: 42.1,
          efficiency: 91.0,
          totalUptime: 230.5,
          totalDowntime: 10.2,
          utilizationRate: 70.1,
          vibration: 0.2,
        },
      },
      usageAnalytics: {
        create: [
          { date: subDays(new Date(), 1), totalUsageHours: 6, totalDowntime: 0, utilizationRate: 75, energyConsumed: 12.5 },
          { date: subDays(new Date(), 2), totalUsageHours: 5, totalDowntime: 1, utilizationRate: 62.5, energyConsumed: 10.1 },
          { date: subDays(new Date(), 3), totalUsageHours: 7, totalDowntime: 0, utilizationRate: 87.5, energyConsumed: 14.3 },
        ],
      },
      alerts: {
        create: [
          {
            type: ALERT_TYPE.WARRANTY_EXPIRING,
            severity: ALERT_SEVERITY.LOW,
            title: "Warranty Expiring Soon",
            message: "Warranty for Bench Drilling Machine expires in 5 days.",
            isResolved: false,
            notifications: {
              create: pusaFitterUsers.map(userId => ({
                userId: userId,
                title: "Warranty Expiring Soon",
                message: "Warranty for Bench Drilling Machine expires in 5 days.",
                type: NOTIFICATION_TYPE.ALERT,
              })),
            },
          },
        ],
      },
    },
  });

  const fitterEquip2 = await prisma.equipment.create({
    data: {
      equipmentId: "ITI_PUSA_FIT_002",
      name: "MIG/CO2 Welding Machine",
      department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
      fitterEquipmentName: "MIG_CO2_WELDING_MACHINE",
      labId: pusaFitterLab.id,
      manufacturer: "ESAB",
      model: "Buddy Mig 200i",
      purchaseDate: subDays(new Date(), 200),
      status: {
        create: {
          status: OPERATIONAL_STATUS.FAULTY,
          healthScore: 35.0,
          lastMaintenanceDate: subDays(new Date(), 80),
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
          temperature: 85.0,
          efficiency: 40.0,
          totalUptime: 80.0,
          totalDowntime: 25.5,
          utilizationRate: 45.0,
          vibration: 1.8,
        },
      },
      alerts: {
        create: [
          {
            type: ALERT_TYPE.FAULT_DETECTED,
            severity: ALERT_SEVERITY.CRITICAL,
            title: "Equipment Fault",
            message: "MIG Welder reports critical power fault. Immediate attention required.",
            isResolved: false,
            notifications: {
              create: pusaFitterUsers.map(userId => ({
                userId: userId,
                title: "CRITICAL: Equipment Fault",
                message: "MIG Welder reports critical power fault.",
                type: NOTIFICATION_TYPE.ALERT,
              })),
            },
          },
           {
            type: ALERT_TYPE.LOW_HEALTH_SCORE,
            severity: ALERT_SEVERITY.HIGH,
            title: "Low Health Score",
            message: "Health score dropped to 35%.",
            isResolved: false,
          },
        ],
      },
    },
  });
  
  const fitterEquip3 = await prisma.equipment.create({
    data: {
      equipmentId: "ITI_PUSA_FIT_003",
      name: "Angle Grinder (Portable)",
      department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
      fitterEquipmentName: "ANGLE_GRINDER_PORTABLE",
      labId: pusaFitterLab.id,
      manufacturer: "Dewalt",
      model: "DW810",
      purchaseDate: subDays(new Date(), 600),
      status: {
        create: {
          status: OPERATIONAL_STATUS.IDLE,
          healthScore: 88.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.FITTER_MANUFACTURING,
          totalUptime: 450.0,
          totalDowntime: 30.0,
          utilizationRate: 65.0,
        },
      },
    },
  });

  // --- Pusa Electrical Lab Equipment (3) ---
  const elecEquip1 = await prisma.equipment.create({
    data: {
      equipmentId: "ITI_PUSA_ELEC_001",
      name: "Electrician Training Panel",
      department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
      electricalEquipmentName: "ELECTRICIAN_TRAINING_PANEL",
      labId: pusaElectricalLab.id,
      manufacturer: "Scientech",
      model: "ST201",
      purchaseDate: subDays(new Date(), 300),
      status: {
        create: {
          status: OPERATIONAL_STATUS.IN_USE,
          healthScore: 98.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
          temperature: 35.0,
          efficiency: 99.0,
          totalUptime: 150.0,
          totalDowntime: 2.0,
          utilizationRate: 80.0,
          voltage: 230.5,
          current: 4.8,
          powerFactor: 0.98
        },
      },
    },
  });

  const elecEquip2 = await prisma.equipment.create({
    data: {
      equipmentId: "ITI_PUSA_ELEC_002",
      name: "Advanced Electrician Setup (PLC/VFD)",
      department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
      electricalEquipmentName: "ADVANCED_ELECTRICIAN_SETUP_PLC_VFD",
      labId: pusaElectricalLab.id,
      manufacturer: "Siemens",
      model: "S7-1200 Trainer",
      purchaseDate: subDays(new Date(), 150),
      status: {
        create: {
          status: OPERATIONAL_STATUS.MAINTENANCE,
          healthScore: 75.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
          temperature: 45.0,
          efficiency: 95.0,
          totalUptime: 90.0,
          totalDowntime: 8.0,
          utilizationRate: 60.0,
          voltage: 228.0,
          current: 5.1,
          powerFactor: 0.95
        },
      },
    },
  });

  const elecEquip3 = await prisma.equipment.create({
    data: {
      equipmentId: "ITI_PUSA_ELEC_003",
      name: "Bench Drilling Machine",
      department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
      electricalEquipmentName: "BENCH_DRILLING_MACHINE",
      labId: pusaElectricalLab.id,
      manufacturer: "Local",
      model: "LDM-100",
      purchaseDate: subDays(new Date(), 800),
      status: {
        create: {
          status: OPERATIONAL_STATUS.IDLE,
          healthScore: 82.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.ELECTRICAL_ENGINEERING,
          totalUptime: 600.0,
          totalDowntime: 50.0,
          utilizationRate: 55.0,
        },
      },
    },
  });

  // --- Mumbai CNC Lab Equipment (3) ---
  const cncEquip1 = await prisma.equipment.create({
    data: {
      equipmentId: "ATI_MUMBAI_CNC_001",
      name: "CNC Vertical Machining Center",
      department: DEPARTMENT_ENUM.ADVANCED_MANUFACTURING_CNC,
      advancedManufacturingEquipmentName: "CNC_VERTICAL_MACHINING_CENTER_3_4_AXIS",
      labId: mumbaiCncLab.id,
      manufacturer: "Haas",
      model: "VF-2",
      purchaseDate: subDays(new Date(), 500),
      status: {
        create: {
          status: OPERATIONAL_STATUS.IN_CLASS,
          healthScore: 95.0,
          isOperatingInClass: true,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.ADVANCED_MANUFACTURING_CNC,
          temperature: 55.0,
          efficiency: 94.0,
          totalUptime: 800.0,
          totalDowntime: 20.0,
          utilizationRate: 85.0,
          spindleSpeed: 7500,
          feedRate: 1500,
          toolWear: 0.2,
          vibration: 0.1
        },
      },
      usageAnalytics: {
        create: [
          { date: subDays(new Date(), 1), totalUsageHours: 7, totalDowntime: 0, utilizationRate: 87.5, energyConsumed: 40.5, classSessions: 2 },
          { date: subDays(new Date(), 2), totalUsageHours: 6, totalDowntime: 0, utilizationRate: 75.0, energyConsumed: 35.1, classSessions: 2 },
        ],
      },
    },
  });

  const cncEquip2 = await prisma.equipment.create({
    data: {
      equipmentId: "ATI_MUMBAI_CNC_002",
      name: "CNC Lathe (2 Axis)",
      department: DEPARTMENT_ENUM.ADVANCED_MANUFACTURING_CNC,
      advancedManufacturingEquipmentName: "CNC_LATHE_2_AXIS",
      labId: mumbaiCncLab.id,
      manufacturer: "Fanuc",
      model: "Series 0i-TF",
      purchaseDate: subDays(new Date(), 500),
      status: {
        create: {
          status: OPERATIONAL_STATUS.WARNING,
          healthScore: 65.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.ADVANCED_MANUFACTURING_CNC,
          temperature: 78.0,
          efficiency: 80.0,
          totalUptime: 750.0,
          totalDowntime: 40.0,
          utilizationRate: 70.0,
          spindleSpeed: 4000,
          feedRate: 1000,
          toolWear: 0.8,
          vibration: 0.7
        },
      },
      alerts: {
        create: [
          {
            type: ALERT_TYPE.HIGH_TEMPERATURE,
            severity: ALERT_SEVERITY.HIGH,
            title: "High Spindle Temperature",
            message: "Spindle temperature reached 78C. Nearing limit.",
            isResolved: false,
            notifications: {
              create: mumbaiCncUsers.map(userId => ({
                userId: userId,
                title: "High Spindle Temperature",
                message: "CNC Lathe spindle temperature is high (78C).",
                type: NOTIFICATION_TYPE.ALERT,
              })),
            },
          },
        ],
      },
    },
  });

  const cncEquip3 = await prisma.equipment.create({
    data: {
      equipmentId: "ATI_MUMBAI_CNC_003",
      name: "3D Printer (FDM)",
      department: DEPARTMENT_ENUM.ADDITIVE_MANUFACTURING,
      additiveManufacturingEquipmentName: "THREE_D_PRINTER_FDM_RESIN",
      labId: mumbaiCncLab.id, 
      manufacturer: "Prusa",
      model: "i3 MK3S+",
      purchaseDate: subDays(new Date(), 300),
      status: {
        create: {
          status: OPERATIONAL_STATUS.IDLE,
          healthScore: 99.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.ADDITIVE_MANUFACTURING,
          temperature: 40.0,
          efficiency: 98.0,
          totalUptime: 300.0,
          totalDowntime: 5.0,
          utilizationRate: 60.0,
          printQuality: 99.5,
          materialUsage: 10.5
        },
      },
    },
  });

  // --- Mumbai Welding Lab Equipment (3) ---
  const weldEquip1 = await prisma.equipment.create({
    data: {
      equipmentId: "ATI_MUMBAI_WELD_001",
      name: "Arc Welding Machine (300A)",
      department: DEPARTMENT_ENUM.WELDING_FABRICATION,
      weldingEquipmentName: "ARC_WELDING_MACHINE_200_300A",
      labId: mumbaiWeldingLab.id,
      manufacturer: "Lincoln Electric",
      model: "Idealarc 250",
      purchaseDate: subDays(new Date(), 600),
      status: {
        create: {
          status: OPERATIONAL_STATUS.OPERATIONAL,
          healthScore: 90.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.WELDING_FABRICATION,
          temperature: 50.0,
          efficiency: 90.0,
          totalUptime: 500.0,
          totalDowntime: 20.0,
          utilizationRate: 70.0,
          vibration: 0.3,
          arcStability: 95.0,
        },
      },
    },
  });

  const weldEquip2 = await prisma.equipment.create({
    data: {
      equipmentId: "ATI_MUMBAI_WELD_002",
      name: "Gas Welding Kit (Oxy-Acetylene)",
      department: DEPARTMENT_ENUM.WELDING_FABRICATION,
      weldingEquipmentName: "GAS_WELDING_KIT_OXY_ACETYLENE",
      labId: mumbaiWeldingLab.id,
      manufacturer: "Victor",
      model: "Performer",
      purchaseDate: subDays(new Date(), 400),
      status: {
        create: {
          status: OPERATIONAL_STATUS.IDLE,
          healthScore: 99.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.WELDING_FABRICATION,
          totalUptime: 300.0,
          totalDowntime: 5.0,
          utilizationRate: 50.0,
        },
      },
    },
  });
  
  const weldEquip3 = await prisma.equipment.create({
    data: {
      equipmentId: "ATI_MUMBAI_WELD_003",
      name: "VR/AR Welding Simulator",
      department: DEPARTMENT_ENUM.WELDING_FABRICATION,
      weldingEquipmentName: "VR_AR_WELDING_SIMULATOR",
      labId: mumbaiWeldingLab.id,
      manufacturer: "SimWeld",
      model: "Pro",
      purchaseDate: subDays(new Date(), 90),
      status: {
        create: {
          status: OPERATIONAL_STATUS.OPERATIONAL,
          healthScore: 100.0,
        },
      },
      analyticsParams: {
        create: {
          department: DEPARTMENT_ENUM.WELDING_FABRICATION,
          totalUptime: 80.0,
          totalDowntime: 1.0,
          utilizationRate: 85.0,
        },
      },
    },
  });

  // 7. =================== CREATE MAINTENANCE LOGS ===================
  console.log("Creating maintenance logs...");
  await prisma.maintenanceLog.create({
    data: {
      equipmentId: fitterEquip1.id,
      type: MAINTENANCE_TYPE.PREVENTIVE,
      status: "COMPLETED", // Use string directly
      scheduledDate: subDays(new Date(), 20),
      completedDate: subDays(new Date(), 20),
      description: "6-month preventive maintenance.",
      cost: 1500.0,
      technicianId: pusaFitterManager.id,
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      equipmentId: fitterEquip2.id,
      type: MAINTENANCE_TYPE.CORRECTIVE,
      status: "IN_PROGRESS", // Use string directly
      scheduledDate: subDays(new Date(), 1),
      description: "Investigating critical power fault.",
      technicianId: pusaFitterManager.id,
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      equipmentId: elecEquip2.id,
      type: MAINTENANCE_TYPE.ROUTINE,
      status: "SCHEDULED", // Use string directly
      scheduledDate: new Date(),
      description: "Calibrating PLC module.",
      technicianId: pusaElectricalManager.id,
    },
  });

  // 8. =================== CREATE REPORTS ===================
  console.log("Creating reports...");
  await prisma.report.create({
    data: {
      reportType: REPORT_TYPE.MONTHLY_SUMMARY,
      title: "Monthly Summary - ITI Pusa - June 2024",
      dateFrom: new Date("2024-06-01T00:00:00.000Z"),
      dateTo: new Date("2024-06-30T23:59:59.000Z"),
      generatedBy: pusaFitterManager.id,
      data: {
        summary: "Overall health stable. Fitter lab requires attention.",
        equipmentCount: 6,
        avgHealth: 85.2,
      },
    },
  });

  await prisma.report.create({
    data: {
      reportType: REPORT_TYPE.DEPARTMENT_SUMMARY,
      title: "All Institutes - CNC Department - Q2 2024",
      dateFrom: new Date("2024-04-01T00:00:00.000Z"),
      dateTo: new Date("2024-06-30T23:59:59.000Z"),
      generatedBy: policyMaker.id,
      data: {
        summary: "CNC equipment usage is high across all ATIs.",
        totalUptime: 1550,
        totalAlerts: 15,
      },
    },
  });

  // 9. =================== CREATE CHAT MESSAGES ===================
  console.log("Creating chat messages...");
  await prisma.chatMessage.createMany({
    data: [
      {
        userId: pusaFitterTrainer1.id,
        message: "What is the status of the MIG welder?",
        response: "The MIG welder (ITI_PUSA_FIT_002) is currently marked as FAULTY with a health score of 35%. A critical power fault was detected.",
        intent: "GET_STATUS"
      },
      {
        userId: pusaFitterTrainer1.id,
        message: "Show me recent alerts.",
        response: "You have 1 unresolved critical alert for ITI_PUSA_FIT_002 (Equipment Fault) and 1 unresolved low alert for ITI_PUSA_FIT_001 (Warranty Expiring Soon).",
        intent: "GET_ALERTS"
      }
    ]
  });

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });