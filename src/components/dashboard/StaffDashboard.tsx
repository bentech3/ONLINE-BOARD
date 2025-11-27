import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, LogOut, Plus, FileText, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NoticeCard from "@/components/NoticeCard";
import CreateNoticeDialog from "@/components/CreateNoticeDialog";
import { Tables } from "@/integrations/supabase/types";

interface StaffDashboardProps {
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

const StaffDashboard = ({ user }: StaffDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [myNotices, setMyNotices] = useState<NoticeWithDetails[]>([]);
  const [allNotices, setAllNotices] = useState<NoticeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch my notices
      const { data: myData, error: myError } = await supabase
        .from("notices")
        .select(`
          *,
          categories (name, color),
          profiles:author_id (full_name)
        `)
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      if (myError) throw myError;
      setMyNotices((myData || []) as unknown as NoticeWithDetails[]);

      // Fetch all approved notices
      const { data: allData, error: allError } = await supabase
        .from("notices")
        .select(`
          *,
          categories (name, color),
          profiles:author_id (full_name)
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (allError) throw allError;
      setAllNotices((allData || []) as unknown as NoticeWithDetails[]);
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
  }, [toast, user.id]);

  useEffect(() => {
    fetchProfile();
    fetchCategories();
    fetchNotices();

    const channel = supabase
      .channel('notices-changes-staff')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notices'
        },
        () => {
          fetchNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfile, fetchCategories, fetchNotices]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const pendingCount = myNotices.filter(n => n.status === 'pending').length;
  const approvedCount = myNotices.filter(n => n.status === 'approved').length;

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
                <h1 className="text-lg font-bold text-foreground">ONBS Staff Portal</h1>
                <p className="text-xs text-muted-foreground">Welcome, {profile?.full_name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Notice
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Total Notices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{myNotices.length}</div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-secondary" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{approvedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Notices Tabs */}
        <Tabs defaultValue="my-notices" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="my-notices">My Notices</TabsTrigger>
            <TabsTrigger value="all-notices">All Notices</TabsTrigger>
          </TabsList>

          <TabsContent value="my-notices" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">My Notices</h2>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : myNotices.length === 0 ? (
                <Card className="border-2">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No notices yet</p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Notice
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {myNotices.map((notice) => (
                    <NoticeCard
                      key={notice.id}
                      notice={notice}
                      userRole="staff"
                      onUpdate={fetchNotices}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all-notices" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">All Approved Notices</h2>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : (
                <div className="grid gap-4">
                  {allNotices.map((notice) => (
                    <NoticeCard key={notice.id} notice={notice} userRole="staff" />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <CreateNoticeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchNotices}
      />
    </div>
  );
};

export default StaffDashboard;
