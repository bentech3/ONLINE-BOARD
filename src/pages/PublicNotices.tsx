import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Search, Filter, Clock, AlertCircle, LogIn, BellRing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";

const PublicNotices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, subscribeToNotices } = useNotifications();
  const [notices, setNotices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchCategories();
    fetchNotices();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('public-notices')
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

    // Subscribe to notifications for new notices
    const unsubscribeNotifications = subscribeToNotices((newNotice) => {
      // Refresh notices when a new one is published
      fetchNotices();
    });

    return () => {
      supabase.removeChannel(channel);
      unsubscribeNotifications();
    };
  }, []);

  const handleNotificationRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast({
        title: "Notifications enabled",
        description: "You'll be notified when new notices are published",
      });
    } else {
      toast({
        title: "Notifications denied",
        description: "You can enable notifications in your browser settings",
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
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
  };

  const fetchNotices = async () => {
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
      setNotices(data || []);

      // Track views for all visible notices (one view per session per notice)
      if (data && data.length > 0) {
        trackNoticeViews(data);
      }
    } catch (error) {
      console.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackNoticeViews = async (notices: any[]) => {
    try {
      // Check which notices haven't been viewed in this session
      const viewedNotices = sessionStorage.getItem('viewed_notices') || '[]';
      const viewedIds = JSON.parse(viewedNotices);

      const newViews = notices
        .filter(notice => !viewedIds.includes(notice.id))
        .map(notice => ({
          notice_id: notice.id,
          user_id: null, // Public views don't have user IDs
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
  };

  const filteredNotices = notices.filter((notice) => {
    const matchesSearch =
      notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || notice.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-accent text-accent-foreground";
      case "normal":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">ONBS Public Portal</h1>
                <p className="text-xs text-muted-foreground">Bishop Barham University</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNotificationRequest}
                disabled={permission === 'granted'}
                className="w-full sm:w-auto"
              >
                <BellRing className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">
                  {permission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
                </span>
                <span className="sm:hidden">
                  {permission === 'granted' ? 'On' : 'Enable'}
                </span>
              </Button>
              <Button variant="outline" onClick={() => navigate("/auth")} className="w-full sm:w-auto">
                <LogIn className="w-4 h-4 mr-2" />
                Staff Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter Bar */}
        <Card className="mb-6 border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
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
                <SelectTrigger className="w-full lg:w-[200px]">
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
            <h2 className="text-2xl font-bold text-foreground">Latest Announcements</h2>
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
                <Card key={notice.id} className="border-2 hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {notice.categories && (
                            <Badge
                              style={{ backgroundColor: notice.categories.color }}
                              className="text-white"
                            >
                              {notice.categories.name}
                            </Badge>
                          )}
                          <Badge className={getPriorityColor(notice.priority)}>
                            {notice.priority}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl mb-2">{notice.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(notice.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{notice.content}</p>
                    {notice.expires_at && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        Expires on {format(new Date(notice.expires_at), "MMM d, yyyy")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Uganda Christian University - Bishop Barham University College</p>
          <p className="mt-2">Online Notice Board System</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicNotices;