import express from 'express';
import reportController from '../controllers/report.controller.js';
import authMiddleware from '../middlewares/auth.js';
import { can } from '../middlewares/rbac.js';
import { 
  reportValidation, 
  dailyReportValidation, 
  weeklyReportValidation, 
  monthlyReportValidation 
} from '../middlewares/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ==========================================
// SPECIFIC ROUTES FIRST (before dynamic :id)
// ==========================================

// Generate daily report
router.post(
  '/daily',
  can.generateReports,
  dailyReportValidation,
  reportController.generateDailyReport
);

// Generate weekly report
router.post(
  '/weekly',
  can.generateReports,
  weeklyReportValidation,
  reportController.generateWeeklyReport
);

// Generate monthly report
router.post(
  '/monthly',
  can.generateReports,
  monthlyReportValidation,
  reportController.generateMonthlyReport
);

// Generate standard report
router.post(
  '/generate',
  can.generateReports,
  reportValidation,
  reportController.generateReport
);

// Download PDF report - MUST BE BEFORE /:id
router.get(
  '/download/:filename', 
  can.viewReports, 
  reportController.downloadPDF
);

// Get all reports
router.get(
  '/', 
  can.viewReports, 
  reportController.getReports
);

// ==========================================
// DYNAMIC ROUTES LAST (catches everything else)
// ==========================================

// Get a single report by ID - MUST BE LAST
router.get(
  '/:id', 
  can.viewReports, 
  reportController.getReportById
);

export default router;