import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import { filterDataByRole } from '../middlewares/rbac.js';
import { generatePDFReport } from '../jobs/reportGeneration.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class ReportController {
  // Helper to calculate average performance metrics
  async calculatePerformanceMetrics(equipmentId, from, to) {
    const [sensorData, usageAnalytics, maintenanceLogs, alerts, status] = await Promise.all([
      prisma.sensorData.findMany({
        where: {
          equipmentId,
          timestamp: { gte: from, lte: to },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.usageAnalytics.findMany({
        where: {
          equipmentId,
          date: { gte: from, lte: to },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.maintenanceLog.findMany({
        where: {
          equipmentId,
          scheduledDate: { gte: from, lte: to },
        },
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.alert.findMany({
        where: {
          equipmentId,
          createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.equipmentStatus.findUnique({
        where: { equipmentId },
      }),
    ]);

    // Calculate averages
    const avgTemperature = sensorData.length > 0
      ? sensorData.reduce((sum, d) => sum + (d.temperature || 0), 0) / sensorData.length
      : 0;
    
    const avgVibration = sensorData.length > 0
      ? sensorData.reduce((sum, d) => sum + (d.vibration || 0), 0) / sensorData.length
      : 0;
    
    const avgEnergyConsumption = sensorData.length > 0
      ? sensorData.reduce((sum, d) => sum + (d.energyConsumption || 0), 0) / sensorData.length
      : 0;
    
    const avgUtilization = usageAnalytics.length > 0
      ? usageAnalytics.reduce((sum, u) => sum + u.utilizationRate, 0) / usageAnalytics.length
      : 0;
    
    const avgEfficiency = usageAnalytics.length > 0
      ? usageAnalytics.reduce((sum, u) => sum + u.efficiency, 0) / usageAnalytics.length
      : 0;
    
    const totalUsageHours = usageAnalytics.reduce((sum, u) => sum + u.totalUsageHours, 0);
    const totalDowntime = usageAnalytics.reduce((sum, u) => sum + u.totalDowntime, 0);
    const totalEnergy = usageAnalytics.reduce((sum, u) => sum + u.energyConsumed, 0);
    
    const anomalyCount = sensorData.filter(d => d.isAnomaly).length;
    const anomalyRate = sensorData.length > 0 ? (anomalyCount / sensorData.length) * 100 : 0;
    
    const alertsBySeverity = {
      CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
      HIGH: alerts.filter(a => a.severity === 'HIGH').length,
      MEDIUM: alerts.filter(a => a.severity === 'MEDIUM').length,
      LOW: alerts.filter(a => a.severity === 'LOW').length,
    };
    
    const maintenanceByType = {
      PREVENTIVE: maintenanceLogs.filter(m => m.type === 'PREVENTIVE').length,
      PREDICTIVE: maintenanceLogs.filter(m => m.type === 'PREDICTIVE').length,
      CORRECTIVE: maintenanceLogs.filter(m => m.type === 'CORRECTIVE').length,
      EMERGENCY: maintenanceLogs.filter(m => m.type === 'EMERGENCY').length,
      ROUTINE: maintenanceLogs.filter(m => m.type === 'ROUTINE').length,
    };
    
    const totalMaintenanceCost = maintenanceLogs.reduce((sum, m) => sum + (m.cost || 0), 0);

    return {
      sensorMetrics: {
        avgTemperature: parseFloat(avgTemperature.toFixed(2)),
        avgVibration: parseFloat(avgVibration.toFixed(2)),
        avgEnergyConsumption: parseFloat(avgEnergyConsumption.toFixed(2)),
        anomalyCount,
        anomalyRate: parseFloat(anomalyRate.toFixed(2)),
        dataPointsCollected: sensorData.length,
      },
      usageMetrics: {
        avgUtilization: parseFloat(avgUtilization.toFixed(2)),
        avgEfficiency: parseFloat(avgEfficiency.toFixed(2)),
        totalUsageHours: parseFloat(totalUsageHours.toFixed(2)),
        totalDowntime: parseFloat(totalDowntime.toFixed(2)),
        totalEnergy: parseFloat(totalEnergy.toFixed(2)),
        uptimePercentage: totalUsageHours + totalDowntime > 0
          ? parseFloat(((totalUsageHours / (totalUsageHours + totalDowntime)) * 100).toFixed(2))
          : 0,
      },
      alertMetrics: {
        totalAlerts: alerts.length,
        alertsBySeverity,
        resolvedAlerts: alerts.filter(a => a.isResolved).length,
        pendingAlerts: alerts.filter(a => !a.isResolved).length,
      },
      maintenanceMetrics: {
        totalMaintenance: maintenanceLogs.length,
        maintenanceByType,
        totalMaintenanceCost: parseFloat(totalMaintenanceCost.toFixed(2)),
        completedMaintenance: maintenanceLogs.filter(m => m.status === 'COMPLETED').length,
        pendingMaintenance: maintenanceLogs.filter(m => m.status === 'SCHEDULED').length,
        overdueMaintenance: maintenanceLogs.filter(m => m.status === 'OVERDUE').length,
      },
      currentStatus: status ? {
        status: status.status,
        healthScore: status.healthScore,
        runningHours: status.runningHours,
        lastMaintenanceDate: status.lastMaintenanceDate,
        nextMaintenanceDate: status.nextMaintenanceDate,
      } : null,
    };
  }

  // Get comprehensive equipment data
  async getEquipmentComprehensiveData(equipmentIds, from, to, roleFilter) {
    const equipmentData = await Promise.all(
      equipmentIds.map(async (id) => {
        const equipment = await prisma.equipment.findUnique({
          where: { id },
          include: {
            status: true,
          },
        });

        if (!equipment) return null;

        const metrics = await this.calculatePerformanceMetrics(id, from, to);

        return {
          equipment: {
            id: equipment.id,
            equipmentId: equipment.equipmentId,
            name: equipment.name,
            department: equipment.department,
            machineCategory: this.getMachineCategory(equipment),
            equipmentName: this.getEquipmentName(equipment),
            manufacturer: equipment.manufacturer,
            model: equipment.model,
            serialNumber: equipment.serialNumber,
            purchaseDate: equipment.purchaseDate,
            warrantyExpiry: equipment.warrantyExpiry,
            location: equipment.location,
            institute: equipment.institute,
            specifications: equipment.specifications,
            isActive: equipment.isActive,
          },
          ...metrics,
        };
      })
    );

    return equipmentData.filter(Boolean);
  }

  // Helper to get machine category based on department
  getMachineCategory(equipment) {
    const categories = {
      MECHANICAL_ENGINEERING: equipment.machineCategoryMechanical,
      FITTER_MANUFACTURING: equipment.machineCategoryFitter,
      ELECTRICAL_ENGINEERING: equipment.machineCategoryElectrical,
      ELECTRONICS_COMMUNICATION: equipment.machineCategoryElectronics,
      AUTOMOTIVE_MECHANIC: equipment.machineCategoryAutomotive,
      WELDING_FABRICATION: equipment.machineCategoryWelding,
      REFRIGERATION_AC: equipment.machineCategoryRefrigerationAC,
      CARPENTRY_WOODWORKING: equipment.machineCategoryCarpentry,
      PLUMBING: equipment.machineCategoryPlumbing,
      ADVANCED_MANUFACTURING_CNC: equipment.machineCategoryAdvancedManufacturing,
      TOOL_DIE_MAKING: equipment.machineCategoryToolDieMaking,
      ADDITIVE_MANUFACTURING: equipment.machineCategoryAdditiveManufacturing,
      SOLAR_INSTALLER_PV: equipment.machineCategorySolarInstaller,
      HOSPITALITY_KITCHEN: equipment.machineCategoryHospitalityKitchen,
      HOSPITALITY_FRONT_OFFICE: equipment.machineCategoryHospitalityFrontOffice,
      HOSPITALITY_HOUSEKEEPING: equipment.machineCategoryHospitalityHousekeeping,
      SECURITY_SERVICES: equipment.machineCategorySecurityServices,
      IT_COMPUTER_LAB: equipment.machineCategoryITComputerLab,
      TEXTILE_SEWING: equipment.machineCategoryTextileSewing,
      MATERIAL_TESTING_QUALITY: equipment.machineCategoryMaterialTestingQuality,
    };
    return categories[equipment.department];
  }

  // Helper to get equipment name based on department
  getEquipmentName(equipment) {
    const names = {
      MECHANICAL_ENGINEERING: equipment.equipmentNameMechanical,
      FITTER_MANUFACTURING: equipment.equipmentNameFitter,
      ELECTRICAL_ENGINEERING: equipment.equipmentNameElectrical,
      ELECTRONICS_COMMUNICATION: equipment.equipmentNameElectronics,
      AUTOMOTIVE_MECHANIC: equipment.equipmentNameAutomotive,
      WELDING_FABRICATION: equipment.equipmentNameWelding,
      REFRIGERATION_AC: equipment.equipmentNameRefrigerationAC,
      CARPENTRY_WOODWORKING: equipment.equipmentNameCarpentry,
      PLUMBING: equipment.equipmentNamePlumbing,
      ADVANCED_MANUFACTURING_CNC: equipment.equipmentNameAdvancedManufacturing,
      TOOL_DIE_MAKING: equipment.equipmentNameToolDieMaking,
      ADDITIVE_MANUFACTURING: equipment.equipmentNameAdditiveManufacturing,
      SOLAR_INSTALLER_PV: equipment.equipmentNameSolarInstaller,
      HOSPITALITY_KITCHEN: equipment.equipmentNameHospitalityKitchen,
      HOSPITALITY_FRONT_OFFICE: equipment.equipmentNameHospitalityFrontOffice,
      HOSPITALITY_HOUSEKEEPING: equipment.equipmentNameHospitalityHousekeeping,
      SECURITY_SERVICES: equipment.equipmentNameSecurityServices,
      IT_COMPUTER_LAB: equipment.equipmentNameITComputerLab,
      TEXTILE_SEWING: equipment.equipmentNameTextileSewing,
      MATERIAL_TESTING_QUALITY: equipment.equipmentNameMaterialTestingQuality,
    };
    return names[equipment.department];
  }

  // Generate Daily Report
  generateDailyReport = asyncHandler(async (req, res) => {
    const { date, generatePDF } = req.body;
    const reportDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(reportDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(reportDate.setHours(23, 59, 59, 999));
    
    const roleFilter = filterDataByRole(req);

    // Get all active equipment
    const equipment = await prisma.equipment.findMany({
      where: { ...roleFilter, isActive: true },
      select: { id: true },
    });

    const equipmentIds = equipment.map(e => e.id);
    const comprehensiveData = await this.getEquipmentComprehensiveData(
      equipmentIds,
      startOfDay,
      endOfDay,
      roleFilter
    );

    // Calculate summary statistics
    const summary = {
      totalEquipment: comprehensiveData.length,
      avgHealthScore: comprehensiveData.reduce((sum, e) => sum + (e.currentStatus?.healthScore || 0), 0) / comprehensiveData.length,
      totalAlerts: comprehensiveData.reduce((sum, e) => sum + e.alertMetrics.totalAlerts, 0),
      criticalAlerts: comprehensiveData.reduce((sum, e) => sum + e.alertMetrics.alertsBySeverity.CRITICAL, 0),
      totalDowntime: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.totalDowntime, 0),
      totalEnergyConsumed: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.totalEnergy, 0),
      avgUtilization: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.avgUtilization, 0) / comprehensiveData.length,
      equipmentByStatus: {
        OPERATIONAL: comprehensiveData.filter(e => e.currentStatus?.status === 'OPERATIONAL').length,
        IN_USE: comprehensiveData.filter(e => e.currentStatus?.status === 'IN_USE').length,
        MAINTENANCE: comprehensiveData.filter(e => e.currentStatus?.status === 'MAINTENANCE').length,
        FAULTY: comprehensiveData.filter(e => e.currentStatus?.status === 'FAULTY').length,
        OFFLINE: comprehensiveData.filter(e => e.currentStatus?.status === 'OFFLINE').length,
      },
    };

    const reportData = {
      reportType: 'DAILY_SUMMARY',
      period: { start: startOfDay, end: endOfDay },
      summary,
      equipmentDetails: comprehensiveData,
      generatedAt: new Date(),
      generatedBy: {
        id: req.user.id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
      },
    };

    const report = await prisma.report.create({
      data: {
        reportType: 'DAILY_SUMMARY',
        title: `Daily Report - ${reportDate.toLocaleDateString()}`,
        dateFrom: startOfDay,
        dateTo: endOfDay,
        generatedBy: req.user.id,
        data: reportData,
      },
    });

    let pdfUrl = null;
    if (generatePDF) {
      pdfUrl = await generatePDFReport(reportData, 'daily');
      await prisma.report.update({
        where: { id: report.id },
        data: { fileUrl: pdfUrl },
      });
    }

    logger.info(`Daily report generated: ${report.id} by ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: 'Daily report generated successfully.',
      data: { ...report, pdfUrl },
    });
  });

  // Generate Weekly Report
  generateWeeklyReport = asyncHandler(async (req, res) => {
    const { weekStart, generatePDF } = req.body;
    const startDate = weekStart ? new Date(weekStart) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    const roleFilter = filterDataByRole(req);

    const equipment = await prisma.equipment.findMany({
      where: { ...roleFilter, isActive: true },
      select: { id: true },
    });

    const equipmentIds = equipment.map(e => e.id);
    const comprehensiveData = await this.getEquipmentComprehensiveData(
      equipmentIds,
      startDate,
      endDate,
      roleFilter
    );

    const summary = {
      totalEquipment: comprehensiveData.length,
      avgHealthScore: comprehensiveData.reduce((sum, e) => sum + (e.currentStatus?.healthScore || 0), 0) / comprehensiveData.length,
      totalAlerts: comprehensiveData.reduce((sum, e) => sum + e.alertMetrics.totalAlerts, 0),
      totalMaintenanceActivities: comprehensiveData.reduce((sum, e) => sum + e.maintenanceMetrics.totalMaintenance, 0),
      totalMaintenanceCost: comprehensiveData.reduce((sum, e) => sum + e.maintenanceMetrics.totalMaintenanceCost, 0),
      totalEnergyConsumed: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.totalEnergy, 0),
      avgUtilization: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.avgUtilization, 0) / comprehensiveData.length,
      totalUsageHours: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.totalUsageHours, 0),
      totalDowntime: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.totalDowntime, 0),
    };

    const reportData = {
      reportType: 'WEEKLY_SUMMARY',
      period: { start: startDate, end: endDate },
      summary,
      equipmentDetails: comprehensiveData,
      generatedAt: new Date(),
      generatedBy: {
        id: req.user.id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
      },
    };

    const report = await prisma.report.create({
      data: {
        reportType: 'WEEKLY_SUMMARY',
        title: `Weekly Report - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        dateFrom: startDate,
        dateTo: endDate,
        generatedBy: req.user.id,
        data: reportData,
      },
    });

    let pdfUrl = null;
    if (generatePDF) {
      pdfUrl = await generatePDFReport(reportData, 'weekly');
      await prisma.report.update({
        where: { id: report.id },
        data: { fileUrl: pdfUrl },
      });
    }

    logger.info(`Weekly report generated: ${report.id} by ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: 'Weekly report generated successfully.',
      data: { ...report, pdfUrl },
    });
  });

  // Generate Monthly Report
  generateMonthlyReport = asyncHandler(async (req, res) => {
    const { year, month, generatePDF } = req.body;
    const reportYear = year || new Date().getFullYear();
    const reportMonth = month || new Date().getMonth();
    
    const startDate = new Date(reportYear, reportMonth, 1);
    const endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59, 999);
    
    const roleFilter = filterDataByRole(req);

    const equipment = await prisma.equipment.findMany({
      where: { ...roleFilter, isActive: true },
      select: { id: true },
    });

    const equipmentIds = equipment.map(e => e.id);
    const comprehensiveData = await this.getEquipmentComprehensiveData(
      equipmentIds,
      startDate,
      endDate,
      roleFilter
    );

    const summary = {
      totalEquipment: comprehensiveData.length,
      avgHealthScore: comprehensiveData.reduce((sum, e) => sum + (e.currentStatus?.healthScore || 0), 0) / comprehensiveData.length,
      totalAlerts: comprehensiveData.reduce((sum, e) => sum + e.alertMetrics.totalAlerts, 0),
      totalMaintenanceActivities: comprehensiveData.reduce((sum, e) => sum + e.maintenanceMetrics.totalMaintenance, 0),
      totalMaintenanceCost: comprehensiveData.reduce((sum, e) => sum + e.maintenanceMetrics.totalMaintenanceCost, 0),
      totalEnergyConsumed: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.totalEnergy, 0),
      avgUtilization: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.avgUtilization, 0) / comprehensiveData.length,
      avgEfficiency: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.avgEfficiency, 0) / comprehensiveData.length,
      totalUsageHours: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.totalUsageHours, 0),
      totalDowntime: comprehensiveData.reduce((sum, e) => sum + e.usageMetrics.totalDowntime, 0),
      topPerformingEquipment: comprehensiveData
        .sort((a, b) => (b.currentStatus?.healthScore || 0) - (a.currentStatus?.healthScore || 0))
        .slice(0, 5)
        .map(e => ({ name: e.equipment.name, healthScore: e.currentStatus?.healthScore })),
      bottomPerformingEquipment: comprehensiveData
        .sort((a, b) => (a.currentStatus?.healthScore || 0) - (b.currentStatus?.healthScore || 0))
        .slice(0, 5)
        .map(e => ({ name: e.equipment.name, healthScore: e.currentStatus?.healthScore })),
    };

    const reportData = {
      reportType: 'MONTHLY_SUMMARY',
      period: { start: startDate, end: endDate },
      summary,
      equipmentDetails: comprehensiveData,
      generatedAt: new Date(),
      generatedBy: {
        id: req.user.id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
      },
    };

    const report = await prisma.report.create({
      data: {
        reportType: 'MONTHLY_SUMMARY',
        title: `Monthly Report - ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        dateFrom: startDate,
        dateTo: endDate,
        generatedBy: req.user.id,
        data: reportData,
      },
    });

    let pdfUrl = null;
    if (generatePDF) {
      pdfUrl = await generatePDFReport(reportData, 'monthly');
      await prisma.report.update({
        where: { id: report.id },
        data: { fileUrl: pdfUrl },
      });
    }

    logger.info(`Monthly report generated: ${report.id} by ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: 'Monthly report generated successfully.',
      data: { ...report, pdfUrl },
    });
  });

  // Original generate report (enhanced)
  generateReport = asyncHandler(async (req, res) => {
    const { reportType, dateFrom, dateTo, title, generatePDF } = req.body;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const roleFilter = filterDataByRole(req);

    const equipmentWhere = {
      equipment: {
        ...roleFilter,
        isActive: true,
      },
    };

    let data = {};

    switch (reportType) {
      case 'MAINTENANCE_HISTORY':
        data = await prisma.maintenanceLog.findMany({
          where: {
            ...equipmentWhere,
            completedDate: { gte: from, lte: to },
          },
          include: {
            equipment: { select: { name: true, equipmentId: true, institute: true } },
            technician: { select: { firstName: true, lastName: true, email: true } },
          },
          orderBy: { completedDate: 'desc' },
        });
        break;
      case 'ALERT_HISTORY':
        data = await prisma.alert.findMany({
          where: {
            ...equipmentWhere,
            createdAt: { gte: from, lte: to },
          },
          include: {
            equipment: { select: { name: true, equipmentId: true, institute: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        break;
      case 'USAGE_ANALYTICS':
        data = await prisma.usageAnalytics.findMany({
          where: {
            ...equipmentWhere,
            date: { gte: from, lte: to },
          },
          include: {
            equipment: { select: { name: true, equipmentId: true, institute: true } },
          },
          orderBy: { date: 'asc' },
        });
        break;
      default:
        data = { message: 'Report type not yet implemented.' };
    }

    const report = await prisma.report.create({
      data: {
        reportType,
        title: title || `${reportType} Report (${from.toLocaleDateString()} - ${to.toLocaleDateString()})`,
        dateFrom: from,
        dateTo: to,
        generatedBy: req.user.id,
        data: data,
      },
    });

    let pdfUrl = null;
    if (generatePDF) {
      pdfUrl = await generatePDFReport({ reportType, data, period: { start: from, end: to } }, reportType.toLowerCase());
      await prisma.report.update({
        where: { id: report.id },
        data: { fileUrl: pdfUrl },
      });
    }

    logger.info(`Report generated: ${report.id} by ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: 'Report generated successfully.',
      data: { ...report, pdfUrl },
    });
  });

  // Get all reports
  getReports = asyncHandler(async (req, res) => {
    const roleFilter = (req.user.role === 'POLICY_MAKER') ? {} : { generatedBy: req.user.id };
    const reports = await prisma.report.findMany({
      where: roleFilter,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: reports });
  });

  // Get a single report
  getReportById = asyncHandler(async (req, res) => {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    if (req.user.role !== 'POLICY_MAKER' && report.generatedBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: report });
  });

  // Add this method to the ReportController class (after getReportById)

  // Download PDF report
  downloadPDF = asyncHandler(async (req, res) => {
    const { filename } = req.params;
    
    // Security: Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      logger.warn(`Invalid filename attempt: ${filename} by ${req.user?.email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid filename' 
      });
    }

    // Validate filename format (should be a PDF)
    if (!filename.endsWith('.pdf')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file type. Only PDF files are allowed.' 
      });
    }

    // Construct file path
    const reportsDir = path.join(process.cwd(), 'reports');
    const filePath = path.join(reportsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`PDF not found: ${filename} requested by ${req.user?.email}`);
      return res.status(404).json({ 
        success: false, 
        message: 'PDF file not found' 
      });
    }

    try {
      // Get file stats
      const stat = fs.statSync(filePath);
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        logger.error(`Error streaming PDF ${filename}: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            message: 'Error streaming PDF file' 
          });
        }
      });
      
      fileStream.pipe(res);
      
      logger.info(`PDF downloaded: ${filename} by ${req.user.email}`);
    } catch (error) {
      logger.error(`Error downloading PDF ${filename}: ${error.message}`);
      res.status(500).json({ 
        success: false, 
        message: 'Error downloading PDF file' 
      });
    }
  });
}

export default new ReportController();