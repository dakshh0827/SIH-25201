import { useEffect, useState } from "react";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useEquipmentStore } from "../../stores/equipmentStore";
import { useAlertStore } from "../../stores/alertStore";
import { useAuthStore } from "../../stores/authStore";
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

export default function LabManagerDashboard() {
  const { user } = useAuthStore();
  const {
    overview,
    fetchOverview,
    isLoading: dashboardLoading,
  } = useDashboardStore();
  const { 
    equipment, 
    fetchEquipment, 
    createEquipment, 
    updateEquipment,
    deleteEquipment,
    isLoading: equipmentLoading 
  } = useEquipmentStore();
  const { alerts, fetchAlerts, resolveAlert } = useAlertStore();
  
  const [selectedLab, setSelectedLab] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [equipmentByLab, setEquipmentByLab] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Group equipment by lab
    if (equipment.length > 0) {
      const grouped = equipment.reduce((acc, eq) => {
        const labName = eq.lab?.name || "Unknown Lab";
        if (!acc[labName]) acc[labName] = [];
        acc[labName].push(eq);
        return acc;
      }, {});
      setEquipmentByLab(grouped);
    }
  }, [equipment]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchOverview(),
        fetchEquipment(), // Backend auto-filters by institute & department
        fetchAlerts({ isResolved: false }),
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
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

  const handleExportData = () => {
    // Export filtered equipment as CSV
    const filteredData = getFilteredEquipment();
    const csv = convertToCSV(filteredData);
    downloadCSV(csv, `equipment-${new Date().toISOString().split('T')[0]}.csv`);
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
    
    const rows = data.map(eq => [
      eq.equipmentId,
      eq.name,
      eq.department,
      eq.lab?.name || "",
      eq.status?.status || "",
      eq.manufacturer,
      eq.model,
      new Date(eq.purchaseDate).toLocaleDateString(),
    ]);
    
    return [headers, ...rows].map(row => row.join(",")).join("\n");
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

  const getFilteredEquipment = () => {
    let filtered = equipment;

    // Filter by lab
    if (selectedLab !== "all") {
      filtered = filtered.filter(eq => eq.lab?.name === selectedLab);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(eq => eq.status?.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(eq =>
        eq.name.toLowerCase().includes(query) ||
        eq.equipmentId.toLowerCase().includes(query) ||
        eq.manufacturer.toLowerCase().includes(query) ||
        eq.model.toLowerCase().includes(query)
      );
    }

    return filtered;
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
      color: "blue",
    },
    {
      icon: TrendingUp,
      title: "Active Equipment",
      value: overview?.overview?.activeEquipment || 0,
      color: "green",
    },
    {
      icon: AlertTriangle,
      title: "Unresolved Alerts",
      value: overview?.overview?.unresolvedAlerts || 0,
      color: "red",
    },
    {
      icon: Wrench,
      title: "Maintenance Due",
      value: overview?.overview?.maintenanceDue || 0,
      color: "yellow",
    },
  ];

  const filteredEquipment = getFilteredEquipment();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Lab Manager Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.institute} | {DEPARTMENT_DISPLAY_NAMES[user?.department] || user?.department}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search equipment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Lab Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lab
            </label>
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Labs</option>
              {Object.keys(equipmentByLab).map((labName) => (
                <option key={labName} value={labName}>
                  {labName} ({equipmentByLab[labName].length})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
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

        {/* Results count and export */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredEquipment.length} of {equipment.length} equipment
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Equipment Management</h2>
              {selectedLab !== "all" && (
                <p className="text-sm text-gray-600 mt-1">
                  Filtered by: {selectedLab}
                </p>
              )}
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
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add your first equipment
                  </button>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Recent Alerts</h2>
            </div>
            <div className="p-4">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No active alerts</p>
                </div>
              ) : (
                <AlertsList
                  alerts={alerts.slice(0, 5)}
                  onResolve={resolveAlert}
                />
              )}
            </div>
          </div>

          {/* Equipment by Lab Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Equipment by Lab</h3>
            </div>
            <div className="p-4">
              {Object.keys(equipmentByLab).length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">
                  No labs with equipment
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(equipmentByLab).map(([labName, items]) => (
                    <div
                      key={labName}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedLab(labName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-600" />
                          <h4 className="font-medium text-gray-900 text-sm">
                            {labName}
                          </h4>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          {items.length}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Form Modal */}
      {isModalOpen && (
        <EquipmentFormModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={editingEquipment ? handleUpdateEquipment : handleCreateEquipment}
          equipment={editingEquipment}
          userDepartment={user?.department}
          userInstitute={user?.institute}
          userRole={user?.role} // Pass user role
        />
      )}
    </div>
  );
}