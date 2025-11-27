import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload, FileType } from "@/hooks/useFileUpload";
import { moderateContent, sanitizeContent } from "@/lib/contentModeration";
import { Loader2, Upload, X, File, Image, Video, AlertTriangle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface CreateNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Attachment {
  file_name: string;
  file_url: string;
  file_type: FileType;
  mime_type: string;
  file_size: number;
}

interface ModerationResult {
  approved: boolean;
  issues: string[];
}

const CreateNoticeDialog = ({ open, onOpenChange, onSuccess }: CreateNoticeDialogProps) => {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useFileUpload();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category_id: "",
    priority: "normal",
    expires_at: "",
    publish_at: "",
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  useEffect(() => {
    if (formData.title || formData.content) {
      const result = moderateContent(formData.title, formData.content);
      setModerationResult(result);
    } else {
      setModerationResult(null);
    }
  }, [formData.title, formData.content]);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await uploadFile(file);
        if (result) {
          setAttachments(prev => [...prev, {
            file_name: file.name,
            file_url: result.url,
            file_type: result.type,
            mime_type: file.type,
            file_size: result.size,
          }]);
        }
      } catch (error: unknown) {
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }
    }

    // Clear the input
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const noticeData: Tables<'notices'>['Insert'] = {
        title: formData.title,
        content: formData.content,
        category_id: formData.category_id || null,
        priority: formData.priority,
        author_id: user.id,
        status: (moderationResult && !moderationResult.approved) ? "pending" : "pending", // All notices go through approval for now
      };

      if (formData.expires_at) {
        noticeData.expires_at = formData.expires_at;
      }

      if (formData.publish_at) {
        noticeData.publish_at = formData.publish_at;
      }

      const { data: notice, error: noticeError } = await supabase
        .from("notices")
        .insert([noticeData])
        .select()
        .single();

      if (noticeError) throw noticeError;

      // Save attachments if any
      if (attachments.length > 0) {
        const attachmentData = attachments.map(attachment => ({
          notice_id: notice.id,
          ...attachment,
        }));

        const { error: attachmentError } = await (supabase as any)
          .from("notice_attachments")
          .insert(attachmentData);

        if (attachmentError) throw attachmentError;
      }

      toast({
        title: "Notice created",
        description: "Your notice has been submitted for approval",
      });

      // Reset form
      setFormData({
        title: "",
        content: "",
        category_id: "",
        priority: "normal",
        expires_at: "",
        publish_at: "",
      });
      setAttachments([]);

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Notice</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new notice. It will be submitted for admin approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={loading}
              placeholder="Enter notice title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: sanitizeContent(e.target.value) })}
              required
              disabled={loading}
              placeholder="Enter notice content"
              rows={6}
            />
            {moderationResult && !moderationResult.approved && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Content Review Required</p>
                  <ul className="mt-1 text-yellow-700 list-disc list-inside">
                    {moderationResult.issues.map((issue: string, index: number) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-yellow-600">
                    This notice will require admin approval before publishing.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publish_at">Publish Date & Time (Optional)</Label>
              <Input
                id="publish_at"
                type="datetime-local"
                value={formData.publish_at}
                onChange={(e) => setFormData({ ...formData, publish_at: e.target.value })}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to publish immediately after approval
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
              <Input
                id="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments (Optional)</Label>
            <div className="space-y-2">
              <Input
                id="attachments"
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={loading || isUploading}
                className="cursor-pointer"
              />
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading files...
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Attached Files:</Label>
                {attachments.map((attachment, index) => (
                  <Card key={index} className="p-2">
                    <CardContent className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(attachment.file_type)}
                        <span className="text-sm truncate max-w-[200px]">
                          {attachment.file_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({(attachment.file_size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        disabled={loading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Notice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNoticeDialog;
