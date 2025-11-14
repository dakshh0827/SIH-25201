// =====================================================
// 26. src/pages/ReportGenerationPage.jsx - FIXED
// =====================================================

import { useState } from "react";
import { useReportStore } from "../stores/reportStore";
import {
  FileText,
  Calendar,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function ReportGenerationPage() {
  const {
    generateDailyReport,
    generateWeeklyReport,
    generateMonthlyReport,
    downloadPDFByFilename,
    isLoading,
  } = useReportStore();
  const [reportType, setReportType] = useState("daily");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    weekStart: new Date().toISOString().split("T")[0],
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    generatePDF: true,
  });

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      let result;
      switch (reportType) {
        case "daily":
          result = await generateDailyReport(
            formData.date,
            formData.generatePDF
          );
          break;
        case "weekly":
          result = await generateWeeklyReport(
            formData.weekStart,
            formData.generatePDF
          );
          break;
        case "monthly":
          result = await generateMonthlyReport(
            formData.year,
            formData.month,
            formData.generatePDF
          );
          break;
      }

      setMessage({
        type: "success",
        text: `${
          reportType.charAt(0).toUpperCase() + reportType.slice(1)
        } report generated successfully!`,
      });

      // Download PDF if available
      if (result.data.pdfUrl && formData.generatePDF) {
        // Use the store's download method instead of window.open
        await downloadPDFByFilename(result.data.pdfUrl);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to generate report. Please try again.",
      });
    }
  };

  const reportTypes = [
    {
      id: "daily",
      title: "Daily Report",
      description:
        "Generate a comprehensive daily summary of equipment status and alerts",
      icon: Calendar,
    },
    {
      id: "weekly",
      title: "Weekly Report",
      description:
        "Get weekly insights on equipment usage, maintenance, and performance",
      icon: Clock,
    },
    {
      id: "monthly",
      title: "Monthly Report",
      description:
        "Detailed monthly analysis with trends, costs, and recommendations",
      icon: FileText,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Generation</h1>
        <p className="text-gray-600 mt-1">
          Generate comprehensive reports for equipment monitoring and analysis
        </p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setReportType(type.id)}
            className={`p-6 rounded-lg border-2 transition-all text-left ${
              reportType === type.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-blue-300"
            }`}
          >
            <type.icon
              className={`w-8 h-8 mb-3 ${
                reportType === type.id ? "text-blue-900" : "text-gray-600"
              }`}
            />
            <h3 className="font-semibold mb-1">{type.title}</h3>
            <p className="text-sm text-gray-600">{type.description}</p>
          </button>
        ))}
      </div>

      {/* Report Generation Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">
          Generate {reportType.charAt(0).toUpperCase() + reportType.slice(1)}{" "}
          Report
        </h2>

        <form onSubmit={handleGenerateReport} className="space-y-4">
          {/* Daily Report Fields */}
          {reportType === "daily" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {/* Weekly Report Fields */}
          {reportType === "weekly" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week Starting Date
              </label>
              <input
                type="date"
                value={formData.weekStart}
                onChange={(e) =>
                  setFormData({ ...formData, weekStart: e.target.value })
                }
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {/* Monthly Report Fields */}
          {reportType === "monthly" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  min="2020"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={formData.month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      month: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value={0}>January</option>
                  <option value={1}>February</option>
                  <option value={2}>March</option>
                  <option value={3}>April</option>
                  <option value={4}>May</option>
                  <option value={5}>June</option>
                  <option value={6}>July</option>
                  <option value={7}>August</option>
                  <option value={8}>September</option>
                  <option value={9}>October</option>
                  <option value={10}>November</option>
                  <option value={11}>December</option>
                </select>
              </div>
            </div>
          )}

          {/* PDF Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="generatePDF"
              checked={formData.generatePDF}
              onChange={(e) =>
                setFormData({ ...formData, generatePDF: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="generatePDF"
              className="text-sm font-medium text-gray-700"
            >
              Generate PDF Report
            </label>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generate Report
              </>
            )}
          </button>
        </form>
      </div>

      {/* Report Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">
          Report Contents Include:
        </h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Equipment status and health metrics</li>
          <li>• Alert summaries by severity</li>
          <li>• Maintenance activities and costs</li>
          <li>• Usage analytics and efficiency metrics</li>
          <li>• Energy consumption data</li>
          <li>• Performance recommendations</li>
        </ul>
      </div>
    </div>
  );
}