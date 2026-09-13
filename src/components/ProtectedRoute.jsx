import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const isAuth = localStorage.getItem("pms_authenticated") === "true";

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
