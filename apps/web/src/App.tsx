import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Loading } from "./components/ui";
import { AssignmentDocumentPage } from "./pages/AssignmentDocumentPage";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { ForcedPasswordChangePage, ProfilePage } from "./pages/ChangePasswordPages";
import { DashboardPage } from "./pages/DashboardPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { DeviceDetailPage } from "./pages/DeviceDetailPage";
import { DevicesPage } from "./pages/DevicesPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { MyAssignmentsPage } from "./pages/MyAssignmentsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { UsersPage } from "./pages/UsersPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <Loading label="Oturum kontrol ediliyor…" />;
  }
  if (state.status === "anonymous") {
    return <Navigate to="/giris" replace state={{ from: location.pathname + location.search }} />;
  }
  // Geçici şifre değiştirilmeden uygulamanın başka bir yerine girilemez.
  if (state.user.mustChangePassword) {
    return <ForcedPasswordChangePage />;
  }
  return children;
}

export function App() {
  const { state } = useAuth();
  const isAdmin = state.status === "authenticated" && state.user.role === "ADMIN";

  return (
    <Routes>
      <Route path="/giris" element={<LoginPage />} />
      <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        {isAdmin ? (
          <>
            <Route index element={<DashboardPage />} />
            <Route path="cihazlar" element={<DevicesPage />} />
            <Route path="cihazlar/:id" element={<DeviceDetailPage />} />
            <Route path="zimmetler" element={<AssignmentsPage />} />
            <Route path="personel" element={<UsersPage />} />
            <Route path="departmanlar" element={<DepartmentsPage />} />
          </>
        ) : (
          <Route index element={<MyAssignmentsPage />} />
        )}
        <Route path="zimmetler/:id/tutanak" element={<AssignmentDocumentPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
