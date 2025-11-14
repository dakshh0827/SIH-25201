/*
 * =====================================================
 * frontend/src/pages/ProfilePage.jsx (UPDATED)
 * =====================================================
 */
import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import {
  User,
  Mail,
  Phone,
  Building,
  Lock,
  Check,
  AlertCircle,
  Briefcase,
  Book,
} from "lucide-react";

// Department display names
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

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditing(false);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile",
      });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    try {
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      setMessage({ type: "success", text: "Password changed successfully!" });
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to change password",
      });
    }
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      TRAINER: "Trainer",
      LAB_MANAGER: "Lab Manager",
      POLICY_MAKER: "Policy Maker",
    };
    return roleMap[role] || role;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>

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
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Profile Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    firstName: user?.firstName || "",
                    lastName: user?.lastName || "",
                    phone: user?.phone || "",
                  });
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            {/* <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{user?.phone || "Not provided"}</p>
              </div>
            </div> */}

            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-medium">{getRoleDisplay(user?.role)}</p>
              </div>
            </div>

            {/* UPDATED: Institute - shown for both LAB_MANAGER and TRAINER */}
            {(user?.role === "LAB_MANAGER" || user?.role === "TRAINER") && (
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Institute</p>
                  <p className="font-medium">
                    {user?.institute?.name || "Not assigned"}
                  </p>
                </div>
              </div>
            )}

            {/* UPDATED: Department - shown for both LAB_MANAGER and TRAINER */}
            {(user?.role === "LAB_MANAGER" || user?.role === "TRAINER") &&
              user?.department && (
                <div className="flex items-center gap-3">
                  <Book className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium">
                      {DEPARTMENT_DISPLAY_NAMES[user.department] ||
                        user.department}
                    </p>
                  </div>
                </div>
              )}

            {/* UPDATED: Lab - shown for both LAB_MANAGER and TRAINER */}
            {(user?.role === "LAB_MANAGER" || user?.role === "TRAINER") &&
              user?.lab && (
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {user.role === "LAB_MANAGER" ? "Primary Lab" : "Lab"}
                    </p>
                    <p className="font-medium">{user.lab.name}</p>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Change Password</h2>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
            >
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
              >
                Update Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-gray-600">
            Keep your account secure by using a strong password
          </p>
        )}
      </div>
    </div>
  );
}