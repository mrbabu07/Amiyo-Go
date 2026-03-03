import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loading from "./Loading";

export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return isAdmin ? children : <Navigate to="/" />;
}
