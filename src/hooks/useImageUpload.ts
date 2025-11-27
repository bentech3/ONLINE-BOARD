// src/hooks/useImageUpload.ts

import { useState } from 'react';
import { supabase } from '../lib/supabase'; // Import the client

const BUCKET_NAME = 'images'; // <--- !!! REPLACE WITH YOUR BUCKET NAME !!!

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    let publicUrl: string | null = null;
    
    try {
      // Create a unique path (e.g., folder/timestamp-random.ext)
      const fileExt = file.name.split('.').pop();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileName = `${Date.now()}-${randomString}.${fileExt}`;
      const filePath = `user_uploads/${fileName}`; // Folder inside the bucket
      
      // 1. Upload the file
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error('Upload failed: ' + uploadError.message);
      }
      
      // 2. Get the Public URL
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      publicUrl = publicUrlData.publicUrl;

    } catch (error: any) {
      console.error('Image upload error:', error.message);
      alert(error.message);
      publicUrl = null;
    } finally {
      setIsUploading(false);
    }

    return publicUrl;
  };

  return { uploadImage, isUploading };
};