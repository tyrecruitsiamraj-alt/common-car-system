import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import FleetHome from "@/pages/fleet/FleetHome";
import FleetBookingsPage from "@/pages/fleet/FleetBookingsPage";
import FleetMonitorPage from "@/pages/fleet/FleetMonitorPage";
import FleetVehicles from "@/pages/fleet/FleetVehicles";
import WLEmployees from "@/pages/wl/WLEmployees";
import EmployeeProfile from "@/pages/wl/EmployeeProfile";
import AddEmployeePage from "@/pages/wl/AddEmployeePage";
import SupervisorDashboard from "@/pages/dashboard/SupervisorDashboard";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import AppearanceSettingsPage from "@/pages/settings/AppearanceSettingsPage";
import AdminRoute from "@/components/auth/AdminRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedShell() {
  const { isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        กำลังโหลด session…
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <AppLayout />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />

      <Route element={<ProtectedShell />}>
        <Route path="/" element={<Navigate to="/fleet" replace />} />
        <Route path="/wl" element={<Navigate to="/fleet" replace />} />
        <Route path="/wl/*" element={<Navigate to="/fleet" replace />} />
        <Route path="/fleet" element={<FleetHome />} />
        <Route path="/fleet/monitor" element={<FleetMonitorPage />} />
        <Route path="/fleet/bookings" element={<FleetBookingsPage mode="book" />} />
        <Route path="/fleet/vehicles" element={<FleetVehicles />} />
        <Route path="/fleet/drivers" element={<WLEmployees />} />
        <Route path="/fleet/drivers/add" element={<AddEmployeePage />} />
        <Route path="/fleet/drivers/:id" element={<EmployeeProfile />} />
        <Route path="/dashboard" element={<SupervisorDashboard />} />
        <Route path="/account/change-password" element={<ChangePasswordPage />} />
        <Route
          path="/settings"
          element={
            <AdminRoute>
              <AppearanceSettingsPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrandingProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </NotificationProvider>
      </BrandingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
