/*
 * =====================================================
 * frontend/src/pages/dashboards/PolicyMakerDashboard.jsx (FIXED)
 * =====================================================
 */
import { useEffect, useState, useMemo } from "react";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useAlertStore } from "../../stores/alertStore";
import { useLabStore } from "../../stores/labStore";
import { useEquipmentStore } from "../../stores/equipmentStore";
import { useInstituteStore } from "../../stores/instituteStore";
import StatCard from "../../components/common/StatCard";
import AlertsList from "../../components/dashboard/AlertsList";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import LabManagerForm from "../../components/admin/labManagerForm";
import InstituteManagerForm from "../../components/admin/InstituteManagerForm";
import api from "../../lib/axios";
import {
  Activity,
  Building,
  AlertTriangle,
  TrendingUp,
  Filter,
  Users,
  Box,
  Plus,
  Edit,
  Trash2,
  BarChart2,
  Building2,
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

export default function PolicyMakerDashboard() {
  const { overview, fetchOverview, isLoading: dashboardLoading } = useDashboardStore();
  const { alerts, fetchAlerts, resolveAlert } = useAlertStore();
  const {
    labs,
    fetchLabs,
    labSummary,
    fetchLabSummary,
    clearLabSummary,
    deleteLab,
    isLoading: labLoading,
  } = useLabStore();
  const { pagination, fetchEquipment } = useEquipmentStore();
  const {
    institutes,
    fetchInstitutes,
    isLoading: institutesLoading,
  } = useInstituteStore();

  // Filter State
  const [selectedInstitute, setSelectedInstitute] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLabId, setSelectedLabId] = useState("all");

  // Data State
  const [labManagersCount, setLabManagersCount] = useState(0);

  // Modal State
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [isInstituteModalOpen, setIsInstituteModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchOverview(),
          fetchAlerts({ isResolved: false }),
          fetchInstitutes(),
          fetchLabs(),
        ]);
        fetchFilteredCounts("all", "all", "all");
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };
    loadInitialData();
  }, []);

  // == FILTER LOGIC ==
  const institutesList = institutes;

  const departmentsList = useMemo(() => {
    if (selectedInstitute === "all") {
      return [...new Set(labs.map((lab) => lab.department))].sort();
    }
    return [
      ...new Set(
        labs
          .filter((lab) => lab.instituteId === selectedInstitute)
          .map((lab) => lab.department)
      ),
    ].sort();
  }, [labs, selectedInstitute]);

  const labsList = useMemo(() => {
    return labs.filter((lab) => {
      const instituteMatch =
        selectedInstitute === "all" || lab.instituteId === selectedInstitute;
      const departmentMatch =
        selectedDepartment === "all" || lab.department === selectedDepartment;
      return instituteMatch && departmentMatch;
    });
  }, [labs, selectedInstitute, selectedDepartment]);

  // Handle filter changes
  const handleInstituteChange = (e) => {
    const inst = e.target.value;
    setSelectedInstitute(inst);
    setSelectedDepartment("all");
    setSelectedLabId("all");
    clearLabSummary();
    fetchFilteredCounts(inst, "all", "all");
  };

  const handleDepartmentChange = (e) => {
    const dept = e.target.value;
    setSelectedDepartment(dept);
    setSelectedLabId("all");
    clearLabSummary();
    fetchFilteredCounts(selectedInstitute, dept, "all");
  };

  const handleLabChange = (e) => {
    const labId = e.target.value;
    setSelectedLabId(labId);
    if (labId !== "all") {
      fetchLabSummary(labId);
    } else {
      clearLabSummary();
    }
    fetchFilteredCounts(selectedInstitute, selectedDepartment, labId);
  };

  // Fetch counts based on filters
  const fetchFilteredCounts = async (instituteId, department, labId) => {
    try {
      // Fetch Lab Managers
      const userParams = new URLSearchParams();
      userParams.append("role", "LAB_MANAGER");
      if (instituteId !== "all") userParams.append("instituteId", instituteId);
      
      const userRes = await api.get("/users", { params: userParams });
      
      // Manual filter by department since backend might not support it
      let managers = userRes.data.data || [];
      if (department !== "all") {
        managers = managers.filter((user) => user.department === department);
      }
      setLabManagersCount(managers.length);

      // Fetch Equipment with proper filters
      const eqParams = {};
      if (instituteId !== "all") eqParams.instituteId = instituteId;
      if (department !== "all") eqParams.department = department;
      if (labId !== "all") eqParams.labId = labId;
      
      await fetchEquipment(eqParams);
    } catch (error) {
      console.error("Failed to fetch filtered counts:", error);
    }
  };

  // ✅ FIXED: Handle alert resolution with real-time updates
  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      // Refresh alerts and overview stats immediately
      await Promise.all([
        fetchAlerts({ isResolved: false }),
        fetchOverview(), // Update the unresolved alerts count
      ]);
    } catch (error) {
      console.error("Failed to resolve alert:", error);
      alert("Failed to resolve alert. Please try again.");
    }
  };

  // == MODAL HANDLERS ==
  const handleOpenCreateLab = () => {
    setEditingLab(null);
    setIsLabModalOpen(true);
  };

  const handleOpenEditLab = (lab) => {
    setEditingLab(lab);
    setIsLabModalOpen(true);
  };

  const handleDeleteLab = async (labId) => {
    if (
      !window.confirm(
        `Are you sure you want to delete lab ${labId}? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteLab(labId);
      // Refresh data after deletion
      await fetchLabs();
      if (selectedLabId === labId) {
        setSelectedLabId("all");
        clearLabSummary();
      }
    } catch (error) {
      alert(error.message || "Failed to delete lab");
    }
  };

  const handleLabModalClose = async () => {
    setIsLabModalOpen(false);
    setEditingLab(null);
    // Refresh labs after create/update
    await fetchLabs();
  };

  const handleInstituteModalClose = async () => {
    setIsInstituteModalOpen(false);
    // Refresh institutes after create/update/delete
    await fetchInstitutes();
    await fetchLabs();
  };

  const isLoading = dashboardLoading || labLoading || institutesLoading;
  
  if (isLoading && !labs.length && !institutes.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const overviewStats = [
    {
      icon: Building,
      title: "Total Institutions",
      value: overview?.overview?.totalInstitutions || 0,
    },
    {
      icon: Activity,
      title: "Total Equipment",
      value: overview?.overview?.totalEquipment || 0,
    },
    {
      icon: AlertTriangle,
      title: "Unresolved Alerts",
      value: overview?.overview?.unresolvedAlerts || 0,
    },
    {
      icon: TrendingUp,
      title: "Avg Health Score",
      value: `${overview?.overview?.avgHealthScore || 0}%`,
    },
  ];

  const filteredStats = [
    {
      icon: Users,
      title: "Lab Managers (Filtered)",
      value: labManagersCount,
    },
    {
      icon: Box,
      title: "Equipment (Filtered)",
      value: pagination.total || 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Policy Maker Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Centralized view and management of all institutions
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsInstituteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Building2 className="w-5 h-5" />
            Manage Institutes
          </button>
          <button
            onClick={handleOpenCreateLab}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Manage Labs
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Overall Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filter Analytics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={selectedInstitute}
            onChange={handleInstituteChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={institutesLoading}
          >
            <option value="all">All Institutes</option>
            {institutesList.map((inst) => (
              <option key={inst.id} value={inst.instituteId}>
                {inst.name}
              </option>
            ))}
          </select>
          <select
            value={selectedDepartment}
            onChange={handleDepartmentChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={departmentsList.length === 0}
          >
            <option value="all">All Departments</option>
            {departmentsList.map((dept) => (
              <option key={dept} value={dept}>
                {DEPARTMENT_DISPLAY_NAMES[dept] || dept}
              </option>
            ))}
          </select>
          <select
            value={selectedLabId}
            onChange={handleLabChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={labsList.length === 0}
          >
            <option value="all">All Labs</option>
            {labsList.map((lab) => (
              <option key={lab.labId} value={lab.labId}>
                {lab.name} ({lab.labId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtered Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Filtered Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </div>

      {/* Lab List & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Labs List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4">
            Labs ({labsList.length})
          </h2>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {labsList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No labs match the selected filters.
              </p>
            ) : (
              labsList.map((lab) => (
                <div
                  key={lab.labId}
                  className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                    selectedLabId === lab.labId
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex-1">
                    <button
                      onClick={() =>
                        handleLabChange({ target: { value: lab.labId } })
                      }
                      className="font-semibold text-blue-900 hover:underline text-left"
                    >
                      {lab.name}
                    </button>
                    <p className="text-sm text-gray-600 mt-1">
                      {lab.institute?.name || "N/A"} |{" "}
                      {DEPARTMENT_DISPLAY_NAMES[lab.department] || lab.department}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{lab.labId}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditLab(lab)}
                      className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit Lab"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLab(lab.labId)}
                      className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete Lab"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lab Analytics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4">Lab Analytics</h2>
          {labLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : labSummary ? (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-blue-900">
                {labSummary.lab?.name || "Lab"}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Total Equipment
                  </span>
                  <span className="font-bold text-lg">
                    {labSummary.statistics?.totalEquipment || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Avg. Health Score
                  </span>
                  <span className="font-bold text-lg text-green-600">
                    {labSummary.statistics?.avgHealthScore?.toFixed(0) || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Total Uptime
                  </span>
                  <span className="font-bold text-lg">
                    {labSummary.statistics?.totalUptime?.toFixed(1) || 0} hrs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Total Downtime
                  </span>
                  <span className="font-bold text-lg text-red-600">
                    {labSummary.statistics?.totalDowntime?.toFixed(1) || 0} hrs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Equipment In Class
                  </span>
                  <span className="font-bold text-lg">
                    {labSummary.statistics?.inClassEquipment || 0}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <BarChart2 className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>Select a lab to view its analytics</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
        {/* ✅ FIXED: Pass handleResolveAlert instead of resolveAlert directly */}
        <AlertsList 
          alerts={alerts.slice(0, 10)} 
          onResolve={handleResolveAlert} 
        />
      </div>

      {/* Modals */}
      {isLabModalOpen && (
        <LabManagerForm
          isOpen={isLabModalOpen}
          onClose={handleLabModalClose}
          labToEdit={editingLab}
        />
      )}
      
      {isInstituteModalOpen && (
        <InstituteManagerForm
          isOpen={isInstituteModalOpen}
          onClose={handleInstituteModalClose}
        />
      )}
    </div>
  );
}