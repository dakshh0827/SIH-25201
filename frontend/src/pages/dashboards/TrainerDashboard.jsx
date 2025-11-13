// =====================================================
// TrainerDashboard.jsx (FIXED - No Manual Filtering)
// =====================================================

import { useEffect, useState } from "react";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useEquipmentStore } from "../../stores/equipmentStore";
import { useAlertStore } from "../../stores/alertStore";
import { useAuthStore } from "../../stores/authStore";
import StatCard from "../../components/common/StatCard";
import EquipmentTable from "../../components/dashboard/EquipmentTable";
import AlertsList from "../../components/dashboard/AlertsList";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { Activity, AlertTriangle, Wrench, TrendingUp } from "lucide-react";

export default function TrainerDashboard() {
  const { user } = useAuthStore();
  const {
    overview,
    fetchOverview,
    isLoading: dashboardLoading,
  } = useDashboardStore();
  const {
    equipment,
    fetchEquipment,
    isLoading: equipmentLoading,
  } = useEquipmentStore();
  const { alerts, fetchAlerts, resolveAlert } = useAlertStore();
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchOverview(),
        // Backend's RBAC middleware automatically filters by user's labId
        // No need to send labId manually
        fetchEquipment(),
        fetchAlerts({ isResolved: false }),
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
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
      change: 5,
      changeType: "positive",
    },
    {
      icon: AlertTriangle,
      title: "Unresolved Alerts",
      value: overview?.overview?.unresolvedAlerts || 0,
      change: -10,
      changeType: "positive",
    },
    {
      icon: Wrench,
      title: "Maintenance Due",
      value: overview?.overview?.maintenanceDue || 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trainer Dashboard</h1>
        {/* Backend returns user.lab.name and user.institute */}
        <p className="text-gray-600 mt-1">
          Lab: {user?.lab?.name || "Unknown"} | Institute:{" "}
          {user?.institute || "Unknown"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Health Score Card */}
      {overview?.overview?.avgHealthScore !== undefined && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-2">Average Health Score</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  overview.overview.avgHealthScore >= 80
                    ? "bg-green-500"
                    : overview.overview.avgHealthScore >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${overview.overview.avgHealthScore}%` }}
              ></div>
            </div>
            <span className="text-2xl font-bold">
              {overview.overview.avgHealthScore}%
            </span>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Table */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Lab Equipment</h2>
          {equipmentLoading ? (
            <LoadingSpinner />
          ) : (
            <EquipmentTable
              equipment={equipment}
              onSelect={setSelectedEquipment}
            />
          )}
        </div>

        {/* Alerts */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
          <AlertsList alerts={alerts.slice(0, 5)} onResolve={resolveAlert} />
        </div>
      </div>

      {/* Equipment Status by Department */}
      {overview?.equipmentByStatus && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">
            Equipment Status Distribution
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {overview.equipmentByStatus.map((item) => (
              <div key={item.status} className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {item.count}
                </div>
                <div className="text-sm text-gray-600">{item.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}