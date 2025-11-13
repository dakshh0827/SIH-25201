import { useState } from "react";
import { 
  Edit2, 
  Trash2, 
  Eye, 
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle 
} from "lucide-react";

const STATUS_CONFIG = {
  OPERATIONAL: { 
    color: "bg-green-100 text-green-800", 
    icon: CheckCircle,
    label: "Operational" 
  },
  IN_USE: { 
    color: "bg-blue-100 text-blue-800", 
    icon: Clock,
    label: "In Use" 
  },
  IN_CLASS: { 
    color: "bg-purple-100 text-purple-800", 
    icon: Clock,
    label: "In Class" 
  },
  IDLE: { 
    color: "bg-gray-100 text-gray-800", 
    icon: Clock,
    label: "Idle" 
  },
  MAINTENANCE: { 
    color: "bg-yellow-100 text-yellow-800", 
    icon: AlertCircle,
    label: "Maintenance" 
  },
  FAULTY: { 
    color: "bg-red-100 text-red-800", 
    icon: XCircle,
    label: "Faulty" 
  },
  OFFLINE: { 
    color: "bg-gray-100 text-gray-800", 
    icon: XCircle,
    label: "Offline" 
  },
  WARNING: { 
    color: "bg-orange-100 text-orange-800", 
    icon: AlertCircle,
    label: "Warning" 
  },
};

export default function EquipmentTable({ 
  equipment = [], 
  onEdit, 
  onDelete, 
  onView,
  showActions = false 
}) {
  const [activeMenu, setActiveMenu] = useState(null);

  const handleMenuToggle = (equipmentId) => {
    setActiveMenu(activeMenu === equipmentId ? null : equipmentId);
  };

  const handleAction = (action, item) => {
    setActiveMenu(null);
    if (action === 'edit' && onEdit) {
      onEdit(item);
    } else if (action === 'delete' && onDelete) {
      onDelete(item.id);
    } else if (action === 'view' && onView) {
      onView(item);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (equipment.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No equipment found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Equipment
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Lab
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Health
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Manufacturer
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Purchase Date
            </th>
            {showActions && (
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {equipment.map((item) => {
            const status = item.status?.status || "OFFLINE";
            const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
            const StatusIcon = statusConfig.icon;
            const healthScore = item.status?.healthScore || 0;

            return (
              <tr 
                key={item.id} 
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Equipment Info */}
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {item.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.equipmentId}
                    </div>
                  </div>
                </td>

                {/* Lab */}
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <div className="text-gray-900">{item.lab?.name || "N/A"}</div>
                    <div className="text-gray-500 text-xs">
                      {item.lab?.institute || ""}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>
                </td>

                {/* Health Score */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                      <div
                        className={`h-2 rounded-full ${
                          healthScore >= 80
                            ? "bg-green-500"
                            : healthScore >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${healthScore}%` }}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium ${getHealthScoreColor(
                        healthScore
                      )}`}
                    >
                      {healthScore}%
                    </span>
                  </div>
                </td>

                {/* Manufacturer */}
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div>{item.manufacturer}</div>
                  <div className="text-gray-500 text-xs">{item.model}</div>
                </td>

                {/* Purchase Date */}
                <td className="px-4 py-4 text-sm text-gray-900">
                  {formatDate(item.purchaseDate)}
                </td>

                {/* Actions */}
                {showActions && (
                  <td className="px-4 py-4 text-right relative">
                    <button
                      onClick={() => handleMenuToggle(item.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>

                    {activeMenu === item.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          {onView && (
                            <button
                              onClick={() => handleAction('view', item)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => handleAction('edit', item)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => handleAction('delete', item)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}