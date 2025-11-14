/*
 * =====================================================
 * LabManagerDashboard.jsx - FIXED
 * =====================================================
 */
import { useEffect, useState } from "react";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useEquipmentStore } from "../../stores/equipmentStore";
import { useAlertStore } from "../../stores/alertStore";
import { useAuthStore } from "../../stores/authStore";
import { useLabStore } from "../../stores/labStore";
import StatCard from "../../components/common/StatCard";
import EquipmentTable from "../../components/dashboard/EquipmentTable";
import AlertsList from "../../components/dashboard/AlertsList";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EquipmentFormModal from "../../components/equipment/EquipmentFormModal";
import {
  Activity,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Building,
  Plus,
  Filter,
  Download,
  BarChart2,
} from "lucide-react";

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

// Helper function to safely get institute name
const getInstituteName = (institute) => {
  if (!institute) return "Unknown Institute";
  if (typeof institute === 'string') return institute;
  if (typeof institute === 'object') {
    return institute.name || institute.instituteId || "Unknown Institute";
  }
  return "Unknown Institute";
};

export default function LabManagerDashboard() {
  const { user } = useAuthStore();
  const { overview, fetchOverview, isLoading: dashboardLoading } = useDashboardStore();
  const {
    equipment,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    isLoading: equipmentLoading,
  } = useEquipmentStore();
  const { alerts, fetchAlerts, resolveAlert } = useAlertStore();
  const {
    labs,
    fetchLabs,
    labSummary,
    fetchLabSummary,
    clearLabSummary,
    isLoading: labLoading,
  } = useLabStore();

  const [selectedLabId, setSelectedLabId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchOverview(),
        fetchEquipment(),
        fetchAlerts({ isResolved: false }),
        fetchLabs(),
      ]);
      clearLabSummary();
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  };

  const handleSelectLab = (labId) => {
    if (labId === selectedLabId) {
      setSelectedLabId("all");
      fetchEquipment();
      clearLabSummary();
    } else {
      setSelectedLabId(labId);
      fetchEquipment({ labId: labId });
      fetchLabSummary(labId);
    }
  };

  const handleCreateEquipment = async (data) => {
    try {
      await createEquipment(data);
      setIsModalOpen(false);
      await loadDashboardData();
    } catch (error) {
      console.error("Failed to create equipment:", error);
      throw error;
    }
  };

  const handleUpdateEquipment = async (id, data) => {
    try {
      await updateEquipment(id, data);
      setIsModalOpen(false);
      setEditingEquipment(null);
      await loadDashboardData();
    } catch (error) {
      console.error("Failed to update equipment:", error);
      throw error;
    }
  };

  const handleDeleteEquipment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this equipment?")) {
      return;
    }
    try {
      await deleteEquipment(id);
      await loadDashboardData();
    } catch (error) {
      console.error("Failed to delete equipment:", error);
      alert("Failed to delete equipment. Please try again.");
    }
  };

  const handleEditClick = (equipment) => {
    setEditingEquipment(equipment);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
  };

  const getFilteredEquipment = () => {
    let filtered = equipment;

    if (selectedStatus !== "all") {
      filtered = filtered.filter((eq) => eq.status?.status === selectedStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (eq) =>
          eq.name.toLowerCase().includes(query) ||
          eq.equipmentId.toLowerCase().includes(query) ||
          eq.manufacturer.toLowerCase().includes(query) ||
          eq.model.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const convertToCSV = (data) => {
    if (!data.length) return "";
    const headers = [
      "Equipment ID",
      "Name",
      "Department",
      "Lab",
      "Status",
      "Manufacturer",
      "Model",
      "Purchase Date",
    ];
    const rows = data.map((eq) => [
      eq.equipmentId,
      eq.name,
      eq.department,
      eq.lab?.name || "",
      eq.status?.status || "",
      eq.manufacturer,
      eq.model,
      new Date(eq.purchaseDate).toLocaleDateString(),
    ]);
    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportData = () => {
    const filteredData = getFilteredEquipment();
    const csv = convertToCSV(filteredData);
    downloadCSV(csv, `equipment-${new Date().toISOString().split("T")[0]}.csv`);
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      icon: Activity,
      title: "Total Equipment",
      value: overview?.overview?.totalEquipment || 0,
    },
    {
      icon: TrendingUp,
      title: "Active Equipment",
      value: overview?.overview?.activeEquipment || 0,
    },
    {
      icon: AlertTriangle,
      title: "Unresolved Alerts",
      value: overview?.overview?.unresolvedAlerts || 0,
    },
    {
      icon: Wrench,
      title: "Maintenance Due",
      value: overview?.overview?.maintenanceDue || 0,
    },
  ];

  const filteredEquipment = getFilteredEquipment();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Lab Manager Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            {getInstituteName(user?.institute)} |{" "}
            {DEPARTMENT_DISPLAY_NAMES[user?.department] || user?.department || "Unknown Department"}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Equipment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Equipment
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, model..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="IN_USE">In Use</option>
              <option value="IN_CLASS">In Class</option>
              <option value="IDLE">Idle</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="FAULTY">Faulty</option>
              <option value="OFFLINE">Offline</option>
              <option value="WARNING">Warning</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredEquipment.length} equipment
          </p>
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">My Labs</h3>
            </div>
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {labs.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">
                  No labs found for your department.
                </p>
              ) : (
                labs.map((lab) => (
                  <div
                    key={lab.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer ${
                      selectedLabId === lab.labId
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() => handleSelectLab(lab.labId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-600" />
                        <h4 className="font-medium text-gray-900 text-sm">
                          {lab.name}
                        </h4>
                      </div>
                      <span className="text-sm font-bold text-blue-600">
                        {lab._count?.equipments || 0} equip.
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-4">Lab Analytics</h2>
            {labLoading ? (
              <LoadingSpinner />
            ) : labSummary ? (
              <div className="space-y-3">
                <h3 className="font-bold text-lg text-blue-900">
                  {labSummary.lab.name}
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Total Equipment
                  </span>
                  <span className="font-bold text-lg">
                    {labSummary.statistics.totalEquipment}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Avg. Health Score
                  </span>
                  <span className="font-bold text-lg text-green-600">
                    {labSummary.statistics.avgHealthScore.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Total Uptime
                  </span>
                  <span className="font-bold text-lg">
                    {labSummary.statistics.totalUptime.toFixed(1)} hrs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Total Downtime
                  </span>
                  <span className="font-bold text-lg text-red-600">
                    {labSummary.statistics.totalDowntime.toFixed(1)} hrs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    Equipment In Class
                  </span>
                  <span className="font-bold text-lg">
                    {labSummary.statistics.inClassEquipment}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <BarChart2 className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Select a lab to view its summary</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                Equipment{" "}
                {selectedLabId !== "all"
                  ? `(Lab: ${labs.find((l) => l.labId === selectedLabId)?.name})`
                  : "(All Labs)"}
              </h2>
            </div>
            <div className="p-4">
              {equipmentLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : filteredEquipment.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No equipment found</p>
                  {selectedLabId === "all" && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Add your first equipment
                    </button>
                  )}
                </div>
              ) : (
                <EquipmentTable
                  equipment={filteredEquipment}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteEquipment}
                  showActions={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
        <AlertsList alerts={alerts.slice(0, 5)} onResolve={resolveAlert} />
      </div>

      {isModalOpen && (
        <EquipmentFormModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={editingEquipment ? handleUpdateEquipment : handleCreateEquipment}
          equipment={editingEquipment}
        />
      )}
    </div>
  );
}