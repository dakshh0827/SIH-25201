/*
 * =====================================================
 * 3. frontend/src/components/dashboard/AlertsList.jsx (FIXED)
 * =====================================================
 */
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  HelpCircle,
} from "lucide-react";

// Helper to format department names
const DEPARTMENT_DISPLAY_NAMES = {
  FITTER_MANUFACTURING: "Fitter/Manufacturing",
  ELECTRICAL_ENGINEERING: "Electrical Engineering",
  WELDING_FABRICATION: "Welding & Fabrication",
  TOOL_DIE_MAKING: "Tool & Die Making",
  ADDITIVE_MANUFACTURING: "Additive Manufacturing",
  SOLAR_INSTALLER_PV: "Solar Installer (PV)",
  MATERIAL_TESTING_QUALITY: "Material Testing/Quality",
  ADVANCED_MANUFACTURING_CNC: "Advanced Manufacturing/CNC",
  AUTOMOTIVE_MECHANIC: "Automotive/Mechanic",
};

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertTriangle,
  },
  HIGH: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
  },
  MEDIUM: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  LOW: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: HelpCircle,
  },
};

export default function AlertsList({ alerts, onResolve }) {
  const getSeverity = (severity) => {
    return SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
  };

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No unresolved alerts</p>
        </div>
      ) : (
        alerts.map((alert) => {
          const severity = getSeverity(alert.severity);
          const SeverityIcon = severity.icon;
          const equipment = alert.equipment;
          const lab = equipment?.lab;

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${severity.color}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Alert Title and Severity */}
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityIcon className="w-4 h-4" />
                    <span className="font-semibold text-sm">
                      {alert.title}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-white rounded">
                      {alert.severity}
                    </span>
                  </div>

                  {/* Alert Message */}
                  <p className="text-sm mb-2">{alert.message}</p>

                  {/* Alert Context - FIXED */}
                  {equipment && lab && (
                    <div className="text-xs opacity-80">
                      {lab.instituteId && (
                        <>
                          <span>{lab.instituteId}</span>
                          <span className="mx-1">➔</span>
                        </>
                      )}
                      <span>
                        {DEPARTMENT_DISPLAY_NAMES[lab.department] ||
                          lab.department}
                      </span>
                      <span className="mx-1">➔</span>
                      <span>{lab.name}</span>
                      <span className="mx-1">➔</span>
                      <span className="font-medium">{equipment.name}</span>
                      <span className="text-gray-600">
                        {" "}
                        ({equipment.equipmentId})
                      </span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-gray-600 mt-2">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Resolve Button */}
                {!alert.isResolved && onResolve && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="ml-4 px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-800 font-medium"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}