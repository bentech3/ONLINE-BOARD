import { useAuth } from "@/contexts/AuthContext";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userRole) {
    return null;
  }

  switch (userRole) {
    case "admin":
      return <AdminDashboard user={user} />;
    case "staff":
      return <StaffDashboard user={user} />;
    case "student":
      return <StudentDashboard user={user} />;
    default:
      return <StudentDashboard user={user} />;
  }
};

export default Dashboard;
