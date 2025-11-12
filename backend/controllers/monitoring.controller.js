import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import { filterDataByRole } from '../middlewares/rbac.js';
import {
  broadcastAlert,
  broadcastNotification,
  broadcastEquipmentStatus,
} from '../config/socketio.js';
import { ALERT_SEVERITY, ALERT_TYPE, NOTIFICATION_TYPE } from '../utils/constants.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Gets the high-level, centralized dashboard for Policy Makers.
 */
const getPolicyMakerDashboard = async () => {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 1. Get high-level overview stats
  const [
    totalEquipment,
    unresolvedAlerts,
    maintenanceDue,
    avgHealthScore,
    institutionData,
  ] = await Promise.all([
    prisma.equipment.count({ where: { isActive: true } }),
    prisma.alert.count({ where: { isResolved: false } }),
    prisma.maintenanceLog.count({
      where: {
        status: { in: ['SCHEDULED', 'OVERDUE'] },
        scheduledDate: { lte: sevenDaysFromNow },
        equipment: { isActive: true },
      },
    }),
    prisma.equipmentStatus.aggregate({
      _avg: { healthScore: true },
      where: { equipment: { isActive: true } },
    }),
    // 2. Get list of all institutions and their individual stats
    prisma.equipment.groupBy({
      by: ['institute'],
      where: { isActive: true },
      _count: {
        id: true,
      },
      orderBy: {
        institute: 'asc',
      },
    }),
  ]);

  // 3. Get alert counts for each institution (more complex query)
  const alertsByInstitute = await prisma.alert.groupBy({
    by: ['equipment.institute'],
    where: { isResolved: false, equipment: { isActive: true } },
    _count: {
      id: true,
    },
  });
  
  // Map alerts to a lookup for easier merging
  const alertMap = alertsByInstitute.reduce((acc, item) => {
    acc[item['equipment.institute']] = item._count.id;
    return acc;
  }, {});

  // 4. Combine equipment counts and alert counts
  const institutions = institutionData.map(inst => ({
    name: inst.institute,
    equipmentCount: inst._count.id,
    unresolvedAlerts: alertMap[inst.institute] || 0,
  }));

  return {
    overview: {
      totalInstitutions: institutions.length,
      totalEquipment,
      unresolvedAlerts,
      maintenanceDue,
      avgHealthScore: Math.round(avgHealthScore._avg.healthScore || 0),
    },
    institutions, // The list of institutions and their stats
  };
};

/**
 * Gets the institute-specific dashboard for Lab Technicians and Users.
 */
const getLabTechAndUserDashboard = async (roleFilter) => {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalEquipment,
    activeEquipment,
    unresolvedAlerts,
    maintenanceDue,
    avgHealthScore,
    recentAlerts,
    equipmentByStatus,
  ] = await Promise.all([
    prisma.equipment.count({ where: { ...roleFilter, isActive: true } }),
    prisma.equipmentStatus.count({
      where: {
        status: { in: ['OPERATIONAL', 'IN_USE'] },
        equipment: { ...roleFilter, isActive: true },
      },
    }),
    prisma.alert.count({
      where: {
        isResolved: false,
        equipment: roleFilter,
      },
    }),
    prisma.maintenanceLog.count({
      where: {
        status: { in: ['SCHEDULED', 'OVERDUE'] },
        scheduledDate: { lte: sevenDaysFromNow },
        equipment: { ...roleFilter, isActive: true },
      },
    }),
    prisma.equipmentStatus.aggregate({
      _avg: { healthScore: true },
      where: { equipment: { ...roleFilter, isActive: true } },
    }),
    prisma.alert.findMany({
      where: {
        isResolved: false,
        equipment: roleFilter,
      },
      include: {
        equipment: {
          select: {
            equipmentId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.equipmentStatus.groupBy({
      by: ['status'],
      where: { equipment: { ...roleFilter, isActive: true } },
      _count: true,
    }),
  ]);

  return {
    overview: {
      totalEquipment,
      activeEquipment,
      unresolvedAlerts,
      maintenanceDue,
      avgHealthScore: Math.round(avgHealthScore._avg.healthScore || 0),
    },
    recentAlerts,
    equipmentByStatus: equipmentByStatus.map((s) => ({
      status: s.status,
      count: s._count,
    })),
  };
};


class MonitoringController {
  // ... (getRealtimeStatus and getSensorData are unchanged) ...
  getRealtimeStatus = asyncHandler(async (req, res) => {
    const roleFilter = filterDataByRole(req);
    const equipmentStatus = await prisma.equipment.findMany({
      where: { ...roleFilter, isActive: true },
      include: {
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: equipmentStatus });
  });

  getSensorData = asyncHandler(async (req, res) => {
    const { equipmentId } = req.params; // This is the string ID
    const { hours = 24 } = req.query;
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    const equipment = await prisma.equipment.findUnique({
      where: { equipmentId },
      select: { id: true },
    });

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const sensorData = await prisma.sensorData.findMany({
      where: { equipmentId: equipment.id, createdAt: { gte: timeThreshold } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: sensorData });
  });

  updateEquipmentStatus = asyncHandler(async (req, res) => {
    const { equipmentId } = req.params; // String ID from IoT device
    const {
      status,
      temperature,
      vibration,
      energyConsumption,
      pressure,
      humidity,
      rpm,
      voltage,
      current,
    } = req.body;

    const equipment = await prisma.equipment.findFirst({
      where: { equipmentId },
      select: { id: true, institute: true, name: true },
    });

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const createdStatus = await prisma.equipmentStatus.create({
      data: {
        equipmentId: equipment.id,
        status,
        temperature,
        vibration,
        energyConsumption,
        pressure,
        humidity,
        rpm,
        voltage,
        current,
      },
    });

    try {
      await prisma.sensorData.create({
        data: {
          equipmentId: equipment.id,
          temperature,
          vibration,
          energyConsumption,
          pressure,
          humidity,
          rpm,
          voltage,
          current,
        },
      });
    } catch (e) {
      // sensorData table may not exist or other non-fatal error; log and continue
      logger.debug('sensorData create skipped:', e.message);
    }

    // Fire-and-forget anomaly check
    this.checkAnomalies(equipment, { temperature, vibration, energyConsumption, pressure, humidity, rpm, voltage, current });

    // Broadcast the updated status
    broadcastEquipmentStatus({ equipmentId, status: createdStatus });

    res.json({ success: true, data: createdStatus });
  });

  checkAnomalies = async (equipment, sensorData) => {
    try {
      const { id: equipmentId, institute, name: equipmentName } = equipment;
      const alertsToCreate = [];

      if (sensorData.temperature && sensorData.temperature > 80) {
        alertsToCreate.push({
          equipmentId,
          type: ALERT_TYPE.HIGH_TEMPERATURE,
          severity: sensorData.temperature > 100 ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.HIGH,
          title: `High Temperature: ${equipmentName}`,
          message: `Temperature reached ${sensorData.temperature}°C.`,
        });
      }
      if (sensorData.vibration && sensorData.vibration > 10) {
        alertsToCreate.push({
          equipmentId,
          type: ALERT_TYPE.ABNORMAL_VIBRATION,
          severity: sensorData.vibration > 15 ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.HIGH,
          title: `Abnormal Vibration: ${equipmentName}`,
          message: `Vibration detected at ${sensorData.vibration} mm/s.`,
        });
      }
      if (sensorData.energyConsumption && sensorData.energyConsumption > 50) {
        alertsToCreate.push({
          equipmentId,
          type: ALERT_TYPE.HIGH_ENERGY_CONSUMPTION,
          severity: ALERT_SEVERITY.MEDIUM,
          title: `High Energy Use: ${equipmentName}`,
          message: `Energy consumption spiked to ${sensorData.energyConsumption} kWh.`,
        });
      }

      if (alertsToCreate.length === 0) return;

      const usersToNotify = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: 'POLICY_MAKER' },
            { role: 'LAB_TECHNICIAN', institute: institute },
          ],
        },
        select: { id: true },
      });
      const userIds = usersToNotify.map((u) => u.id);

      for (const alertData of alertsToCreate) {
        const newAlert = await prisma.alert.create({
          data: {
            ...alertData,
            notifications: {
              create: userIds.map((userId) => ({
                userId: userId,
                title: alertData.title,
                message: alertData.message,
                type: NOTIFICATION_TYPE.ALERT,
              })),
            },
          },
          include: {
            notifications: true,
            equipment: { select: { name: true, equipmentId: true } },
          },
        });

        broadcastAlert(newAlert);
        for (const notification of newAlert.notifications) {
          broadcastNotification(notification.userId, notification);
        }
        logger.info(`Alert created and notifications sent for equipment ${equipmentId}`);
      }
    } catch (error) {
      logger.error('Check anomalies service error:', error);
    }
  };

  // --- UPDATED DASHBOARD FUNCTION ---

  // Get dashboard overview (Smart Dashboard)
  getDashboardOverview = asyncHandler(async (req, res) => {
    const { role } = req.user;
    
    let data;
    if (role === 'POLICY_MAKER') {
      // Policy Maker gets the centralized, high-level dashboard
      data = await getPolicyMakerDashboard();
    } else {
      // Lab Techs and Users get the dashboard scoped to their institute
      const roleFilter = filterDataByRole(req);
      data = await getLabTechAndUserDashboard(roleFilter);
    }

    res.json({
      success: true,
      data,
    });
  });
}

export default new MonitoringController();