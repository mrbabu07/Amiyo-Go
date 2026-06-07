import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  // Normalize the API for consistency
  return {
    user: context.user,
    dbUser: context.dbUser,
    jwtRole: context.jwtRole,
    role: context.role,
    permissions: context.permissions,
    vendorProfile: context.vendorProfile,
    vendorStatus: context.vendorStatus,
    loading: context.loading,
    isAdmin: context.isAdmin,
    isAdminStaff: context.isAdminStaff,
    register: context.createUser,
    login: context.signIn,
    googleLogin: context.googleLogin,
    logout: context.logOut,
    refreshUserData: context.refreshUserData,
  };
}
