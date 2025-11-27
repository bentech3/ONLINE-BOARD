import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, LogOut, Search, Filter, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NoticeCard from "@/components/NoticeCard";
import { Tables } from "@/integrations/supabase/types";

interface StudentDashboardProps {
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

const StudentDashboard = ({ user }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notices, setNotices] = useState<NoticeWithDetails[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);

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
      const { data, error } = await supabase
        .from("notices")
        .select(`
          *,
          categories (name, color),
          profiles:author_id (full_name),
          attachments:notice_attachments (*)
        `)
        .eq("status", "approved")
        .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotices((data || []) as NoticeWithDetails[]);

      // Track views for authenticated users
      if (data && data.length > 0) {
        trackNoticeViews((data || []) as NoticeWithDetails[]);
      }
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
  }, [toast, user.id, trackNoticeViews]);

  const trackNoticeViews = useCallback(async (notices: NoticeWithDetails[]) => {
    try {
      // Check which notices haven't been viewed in this session
      const viewedNotices = sessionStorage.getItem('viewed_notices') || '[]';
      const viewedIds = JSON.parse(viewedNotices);

      const newViews = notices
        .filter(notice => !viewedIds.includes(notice.id))
        .map(notice => ({
          notice_id: notice.id,
          user_id: user.id,
          viewed_at: new Date().toISOString()
        }));

      if (newViews.length > 0) {
        const { error } = await supabase
          .from("notice_views")
          .insert(newViews);

        if (!error) {
          // Mark these notices as viewed in this session
          const updatedViewedIds = [...viewedIds, ...newViews.map(v => v.notice_id)];
          sessionStorage.setItem('viewed_notices', JSON.stringify(updatedViewedIds));
        }
      }
    } catch (error) {
      console.error("Error tracking notice views:", error);
    }
  }, [user.id]);

  useEffect(() => {
    fetchProfile();
    fetchCategories();
    fetchNotices();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notices-changes')
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

  const filteredNotices = notices.filter((notice) => {
    const matchesSearch = 
      notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "all" || notice.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
                <h1 className="text-lg font-bold text-foreground">ONBS Student Portal</h1>
                <p className="text-xs text-muted-foreground">Welcome, {profile?.full_name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter Bar */}
        <Card className="mb-6 border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search notices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Total Notices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{notices.length}</div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary" />
                Recent Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {notices.filter(n => {
                  const dayAgo = new Date();
                  dayAgo.setDate(dayAgo.getDate() - 1);
                  return new Date(n.created_at) > dayAgo;
                }).length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Urgent Notices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {notices.filter(n => n.priority === 'urgent').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notices List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">All Notices</h2>
            <Badge variant="secondary">{filteredNotices.length} notices</Badge>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading notices...</div>
          ) : filteredNotices.length === 0 ? (
            <Card className="border-2">
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notices found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredNotices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} userRole="student" />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
