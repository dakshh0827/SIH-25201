// =====================================================
// SignupPage.jsx (FIXED - Correct fields for each role)
// =====================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  Activity,
  User,
  Mail,
  Lock,
  Building,
  AlertCircle,
} from "lucide-react";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "TRAINER",
    phone: "",
    institute: "",
    department: "",
    labId: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Role-specific validation based on backend requirements
    if (formData.role === "LAB_MANAGER") {
      if (!formData.institute) {
        setError("Institute is required for Lab Managers");
        return;
      }
      if (!formData.department) {
        setError("Department is required for Lab Managers");
        return;
      }
    }

    if (formData.role === "TRAINER") {
      if (!formData.institute) {
        setError("Institute is required for Trainers");
        return;
      }
      if (!formData.labId) {
        setError("Lab ID is required for Trainers");
        return;
      }
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      
      // Clean up data based on role to match backend expectations
      const cleanData = { ...registerData };
      
      if (formData.role === "POLICY_MAKER") {
        // Policy makers don't need institute, department, or labId
        delete cleanData.institute;
        delete cleanData.department;
        delete cleanData.labId;
      } else if (formData.role === "LAB_MANAGER") {
        // Lab managers need institute and department, but NOT labId
        delete cleanData.labId;
      } else if (formData.role === "TRAINER") {
        // Trainers need institute and labId, but NOT department
        delete cleanData.department;
      }

      await register(cleanData);
      navigate("/verify-email", { state: { email: formData.email } });
    } catch (err) {
      setError(
        err.message ||
          "Registration failed. Please check your inputs and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const departments = [
    "FITTER_MANUFACTURING",
    "ELECTRICAL_ENGINEERING",
    "WELDING_FABRICATION",
    "TOOL_DIE_MAKING",
    "ADDITIVE_MANUFACTURING",
    "SOLAR_INSTALLER_PV",
    "MATERIAL_TESTING_QUALITY",
    "ADVANCED_MANUFACTURING_CNC",
    "AUTOMOTIVE_MECHANIC",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Activity className="w-12 h-12 text-blue-900" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-600 mt-2">
            Join the IoT Equipment Monitoring Platform
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="TRAINER">Trainer</option>
                <option value="LAB_MANAGER">Lab Manager</option>
                <option value="POLICY_MAKER">Policy Maker</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === "TRAINER" && "Trainers manage equipment in their assigned lab"}
                {formData.role === "LAB_MANAGER" && "Lab Managers oversee all labs in their department"}
                {formData.role === "POLICY_MAKER" && "Policy Makers have system-wide access"}
              </p>
            </div>

            {/* Institute (for LAB_MANAGER and TRAINER) */}
            {(formData.role === "LAB_MANAGER" || formData.role === "TRAINER") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institute Name *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="institute"
                    value={formData.institute}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., ITI Pusa, Polytechnic College Delhi"
                    required
                  />
                </div>
              </div>
            )}

            {/* Department (for LAB_MANAGER only) */}
            {formData.role === "LAB_MANAGER" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  You will manage all labs in this department
                </p>
              </div>
            )}

            {/* Lab ID (for TRAINER only) */}
            {formData.role === "TRAINER" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lab ID *
                </label>
                <input
                  type="text"
                  name="labId"
                  value={formData.labId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., ITI-PUSA-MECH-01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the unique Lab ID provided by your institute
                </p>
              </div>
            )}

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    minLength={8}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-900 hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-600 hover:text-blue-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}