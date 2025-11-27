import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, CheckCircle, XCircle, Trash2, AlertCircle, File, Image, Video, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

interface Attachment {
  file_name: string;
  file_url: string;
  file_type: string;
  mime_type: string;
  file_size: number;
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
  attachments?: Attachment[];
}

interface NoticeCardProps {
  notice: NoticeWithDetails;
  userRole: string;
  onUpdate?: () => void;
  showAttachments?: boolean;
}

const NoticeCard = ({ notice, userRole, onUpdate, showAttachments = true }: NoticeCardProps) => {
  const { toast } = useToast();

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from("notices")
        .update({ 
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", notice.id);

      if (error) throw error;

      toast({
        title: "Notice approved",
        description: "The notice has been approved successfully",
      });

      onUpdate?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    try {
      const { error } = await supabase
        .from("notices")
        .update({ status: "rejected" })
        .eq("id", notice.id);

      if (error) throw error;

      toast({
        title: "Notice rejected",
        description: "The notice has been rejected",
      });

      onUpdate?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      const { error } = await supabase
        .from("notices")
        .delete()
        .eq("id", notice.id);

      if (error) throw error;

      toast({
        title: "Notice deleted",
        description: "The notice has been deleted successfully",
      });

      onUpdate?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-secondary text-secondary-foreground";
      case "pending":
        return "bg-accent text-accent-foreground";
      case "rejected":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="border-2 hover:border-primary/50 transition-all">
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
              <Badge className={getStatusColor(notice.status)}>
                {notice.status}
              </Badge>
            </div>
            <CardTitle className="text-xl mb-2">{notice.title}</CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {notice.profiles?.full_name || "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(notice.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </CardDescription>
          </div>

          {userRole === "admin" && (
            <div className="flex gap-2">
              {notice.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                    onClick={handleApprove}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={handleReject}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-wrap">{notice.content}</p>

        {showAttachments && notice.attachments && notice.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium text-foreground">Attachments:</div>
            <div className="space-y-1">
              {notice.attachments.map((attachment: Attachment, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  {getFileIcon(attachment.file_type)}
                  <span className="text-sm flex-1 truncate">{attachment.file_name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(attachment.file_url, '_blank')}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {notice.publish_at && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {new Date(notice.publish_at) > new Date()
              ? `Scheduled for ${format(new Date(notice.publish_at), "MMM d, yyyy 'at' h:mm a")}`
              : `Published ${format(new Date(notice.publish_at), "MMM d, yyyy 'at' h:mm a")}`
            }
          </div>
        )}

        {notice.expires_at && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Expires on {format(new Date(notice.expires_at), "MMM d, yyyy")}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NoticeCard;
