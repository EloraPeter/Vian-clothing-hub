import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileSection({ profile, setProfile, user }) {
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;

    setUploading(true);
    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError.message);
      alert("Error uploading avatar: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError.message);
      alert("Error updating profile: " + updateError.message);
    } else {
      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      setAvatarFile(null);
      setPreviewUrl(null);
    }

    setUploading(false);
  };

  return (
    <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-purple-800 mb-4">Admin Profile</h2>
      <div className="flex items-center space-x-4">
        <img
          src={profile?.avatar_url || "/default-avatar.png"}
          alt="Admin Avatar"
          className="w-16 h-16 rounded-full object-cover border-2 border-purple-600"
        />
        <div>
          <p className="font-medium text-gray-700">{profile?.email}</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
            disabled={uploading}
          />
          {previewUrl && (
            <div className="mt-2">
              <img
                src={previewUrl}
                alt="Avatar Preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-600"
              />
              <button
                onClick={handleUploadAvatar}
                disabled={uploading}
                className={`mt-2 px-3 py-1 rounded-md font-semibold text-white transition-colors ${
                  uploading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {uploading ? "Uploading..." : "Upload Avatar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}