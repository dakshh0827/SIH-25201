import { create } from "zustand";
import api from "../lib/axios";

export const useReportStore = create((set) => ({
  reports: [],
  isLoading: false,

  fetchReports: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get("/reports");
      set({ reports: response.data.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  generateDailyReport: async (date, generatePDF = false) => {
    try {
      const response = await api.post("/reports/daily", { date, generatePDF });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  generateWeeklyReport: async (weekStart, generatePDF = false) => {
    try {
      const response = await api.post("/reports/weekly", {
        weekStart,
        generatePDF,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  generateMonthlyReport: async (year, month, generatePDF = false) => {
    try {
      const response = await api.post("/reports/monthly", {
        year,
        month,
        generatePDF,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Download a PDF report by filename
   * @param {string} filename - The filename from the pdfUrl (e.g., "daily-report-2024-01-15-123456.pdf")
   */
  downloadPDFByFilename: async (filename) => {
    try {
      // Extract just the filename from the path if it includes /reports/
      const actualFilename = filename.startsWith('/reports/') 
        ? filename.replace('/reports/', '') 
        : filename;

      const response = await api.get(`/reports/download/${actualFilename}`, {
        responseType: "blob",
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = actualFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Download error:", error);
      throw error;
    }
  },

  /**
   * Download a report by report ID from the database
   * @param {string} reportId - The MongoDB ObjectId of the report
   */
  downloadReportById: async (reportId) => {
    try {
      // First get the report to find the fileUrl
      const reportResponse = await api.get(`/reports/${reportId}`);
      const report = reportResponse.data.data;

      if (!report.fileUrl) {
        throw new Error("This report does not have a PDF file");
      }

      // Extract filename and download
      const filename = report.fileUrl.replace('/reports/', '');
      return await useReportStore.getState().downloadPDFByFilename(filename);
    } catch (error) {
      console.error("Download error:", error);
      throw error;
    }
  },

  /**
   * Open PDF in new tab instead of downloading
   * @param {string} filename - The filename from the pdfUrl
   */
  openPDFInNewTab: async (filename) => {
    try {
      const actualFilename = filename.startsWith('/reports/') 
        ? filename.replace('/reports/', '') 
        : filename;

      // Get the API base URL from axios instance
      const apiBaseUrl = api.defaults.baseURL;
      
      // Open in new tab
      window.open(`${apiBaseUrl}/reports/download/${actualFilename}`, '_blank');
      
      return true;
    } catch (error) {
      console.error("Open PDF error:", error);
      throw error;
    }
  },
}));