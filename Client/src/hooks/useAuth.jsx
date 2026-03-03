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
    loading: context.loading,
    isAdmin: context.isAdmin,
    register: context.createUser,
    login: context.signIn,
    googleLogin: context.googleLogin,
    logout: context.logOut,
  };
}
