import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, LogOut, Users, FileText, Eye, TrendingUp, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NoticeCard from "@/components/NoticeCard";
import ManageRolesDialog from "@/components/ManageRolesDialog";
import CreateUserDialog from "@/components/CreateUserDialog";
import AuditLogsViewer from "@/components/AuditLogsViewer";
import { Tables } from "@/integrations/supabase/types";

interface AdminDashboardProps {
  user: User;
}

interface NoticeWithDetails extends Omit<Tables<'notices'>, 'publish_at' | 'expires_at'> {
  publish_at?: string | null;
  expires_at?: string | null;
  categories?: {
    name: string;
    color: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
  attachments?: {
    file_name: string;
    file_url: string;
    file_type: string;
    mime_type: string;
    file_size: number;
  }[];
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [pendingNotices, setPendingNotices] = useState<NoticeWithDetails[]>([]);
  const [allNotices, setAllNotices] = useState<NoticeWithDetails[]>([]);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalNotices: 0,
    totalViews: 0,
    pendingCount: 0,
    recentViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showRolesDialog, setShowRolesDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [user.id]);

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch pending notices
      const { data: pendingData, error: pendingError } = await supabase
        .from("notices")
        .select(`
          *,
          categories (name, color),
          profiles:author_id (full_name),
          attachments:notice_attachments (*)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;
      setPendingNotices((pendingData || []) as NoticeWithDetails[]);

      // Fetch all notices
      const { data: allData, error: allError } = await supabase
        .from("notices")
        .select(`
          *,
          categories (name, color),
          profiles:author_id (full_name),
          attachments:notice_attachments (*)
        `)
        .order("created_at", { ascending: false });

      if (allError) throw allError;
      setAllNotices((allData || []) as NoticeWithDetails[]);
    } catch (error) {
      console.error("Error fetching notices:", error);
      toast({
        title: "Error",
        description: "Failed to load notices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true });

      // Fetch notices count
      const { count: noticesCount } = await supabase
        .from("notices")
        .select("*", { count: 'exact', head: true });

      // Fetch views count
      const { count: viewsCount } = await supabase
        .from("notice_views")
        .select("*", { count: 'exact', head: true });

      // Fetch pending count
      const { count: pendingCount } = await supabase
        .from("notices")
        .select("*", { count: 'exact', head: true })
        .eq("status", "pending");

      // Fetch recent views (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentViewsCount } = await supabase
        .from("notice_views")
        .select("*", { count: 'exact', head: true })
        .gte("viewed_at", sevenDaysAgo.toISOString());

      setAnalytics({
        totalUsers: usersCount || 0,
        totalNotices: noticesCount || 0,
        totalViews: viewsCount || 0,
        pendingCount: pendingCount || 0,
        recentViews: recentViewsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchNotices();
    fetchAnalytics();

    const channel = supabase
      .channel('notices-changes-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notices'
        },
        () => {
          fetchNotices();
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfile, fetchNotices, fetchAnalytics]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">ONBS Admin Portal</h1>
                <p className="text-xs text-muted-foreground">Welcome, {profile?.full_name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateUserDialog(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRolesDialog(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Roles
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{analytics.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-secondary" />
                Total Notices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{analytics.totalNotices}</div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                Total Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{analytics.totalViews}</div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Recent Views (7d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{analytics.recentViews}</div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-destructive" />
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{analytics.pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="pending">
              Pending ({analytics.pendingCount})
            </TabsTrigger>
            <TabsTrigger value="all">All Notices</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Pending Approval</h2>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : pendingNotices.length === 0 ? (
                <Card className="border-2">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending notices</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pendingNotices.map((notice) => (
                    <NoticeCard
                      key={notice.id}
                      notice={notice}
                      userRole="admin"
                      onUpdate={fetchNotices}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">All Notices</h2>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : (
                <div className="grid gap-4">
                  {allNotices.map((notice) => (
                    <NoticeCard
                      key={notice.id}
                      notice={notice}
                      userRole="admin"
                      onUpdate={fetchNotices}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AuditLogsViewer />
          </TabsContent>
       </Tabs>
     </main>

      <ManageRolesDialog
        open={showRolesDialog}
        onOpenChange={setShowRolesDialog}
      />

      <CreateUserDialog
        open={showCreateUserDialog}
        onOpenChange={setShowCreateUserDialog}
      />
    </div>
  );
};

export default AdminDashboard;
