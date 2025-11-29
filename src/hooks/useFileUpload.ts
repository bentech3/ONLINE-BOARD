// src/hooks/useFileUpload.ts

import { useState } from 'react';
import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'onbs-files'; // ✅ FIXED BUCKET NAME

export type FileType = 'image' | 'video' | 'document';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const getFileType = (file: File): FileType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: FileType; size: number } | null> => {
    setIsUploading(true);

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 50MB');
      }

      const fileExt = file.name.split('.').pop();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileName = `${Date.now()}-${randomString}.${fileExt}`;
      const filePath = `notice_attachments/${fileName}`; // folder auto-created 🔥

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw new Error('Upload failed: ' + uploadError.message);

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

      return {
        url: data.publicUrl,
        type: getFileType(file),
        size: file.size,
      };

    } catch (error: any) {
      console.error('File upload error:', error.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
};
