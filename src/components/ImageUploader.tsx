// src/components/ImageUploader.tsx

import React, { useState } from 'react';
import { useImageUpload } from '../hooks/useImageUpload'; // Import the hook

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const { uploadImage, isUploading } = useImageUpload();

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first.');
      return;
    }
    
    // Call the custom hook function
    const url = await uploadImage(file);
    
    if (url) {
      onUploadSuccess(url);
      setFile(null); // Clear the file input
      alert('Image uploaded successfully!');
    } else {
      alert('Failed to upload image.');
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
        disabled={isUploading}
      />
      <button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
      {isUploading && <p>Please wait, uploading...</p>}
    </div>
  );
};