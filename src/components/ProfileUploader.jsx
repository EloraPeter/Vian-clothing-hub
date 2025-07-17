import { useState } from 'react';
import { uploadAvatar } from '@/lib/supabaseFunctions';

export default function ProfileUploader({ userId, onUploadSuccess }) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadAvatar(file, userId);
            alert('Upload successful!');
            onUploadSuccess(url);
        } catch (err) {
            alert('Upload failed');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mt-4">
            <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="border p-2 rounded"
            />
        </div>
    );
}
