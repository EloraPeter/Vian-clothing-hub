import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ProfileSection({ profile, setProfile, user }) {
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [newPassword, setNewPassword] = useState("");

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
      toast.error("Error uploading avatar: " + uploadError.message);
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
      toast.error("Error updating profile: " + updateError.message);
    } else {
      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      setAvatarFile(null);
      setPreviewUrl(null);
    }

    setUploading(false);
  };

   const handleNewPasswordChange = (e) => {
      const val = e.target.value;
      setNewPassword(val);
      setStrengthScore(zxcvbn(val).score);
    };

  return (
    <>
      <ToastContainer />
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
                  className={`mt-2 px-3 py-1 rounded-md font-semibold text-white transition-colors ${uploading ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
                    }`}
                >
                  {uploading ? "Uploading..." : "Upload Avatar"}
                </button>
              </div>
            )}
          </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            let avatar_url = profile.avatar_url;

            if (avatarFile) {
              setUploading(true);
              const fileExt = avatarFile.name.split(".").pop();
              const fileName = `${user.id}.${fileExt}`;
              const filePath = `${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, avatarFile, { upsert: true });

              if (uploadError) {
                alert("Upload failed: " + uploadError.message);
                setUploading(false);
                return;
              }

              const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
              avatar_url = data.publicUrl;
              setUploading(false);
            }

            const { error } = await supabase
              .from("profiles")
              .update({
                email: profile.email,
                avatar_url,
                first_name: profile.first_name,
                last_name: profile.last_name,
              })
              .eq("id", user.id);

            if (error) alert("Update failed: " + error.message);
            else {
              alert("Profile updated successfully");
              setProfile({ ...profile, avatar_url });
              setAvatarFile(null);
              setPreviewUrl(null);
            }
          }}
          className="space-y-4"
        >
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* First Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={profile?.first_name || ""}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Last Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={profile?.last_name || ""}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-purple-600 text-white font-semibold py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Save Changes"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-purple-800 mb-4">Change Password</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const oldPassword = e.target.old_password.value;
            const newPassword = e.target.new_password.value;

            const { data: { session } } = await supabase.auth.getSession();
            const email = session?.user?.email;

            if (!email) {
              alert("You're not logged in.");
              return;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password: oldPassword,
            });

            if (signInError) {
              alert("Old password is incorrect.");
              return;
            }

            const { error: updateError } = await supabase.auth.updateUser({
              password: newPassword,
            });

            if (updateError) {
              alert("Password update failed: " + updateError.message);
            } else {
              alert("Password updated successfully!");
              e.target.reset();
              setNewPassword("");
              setStrengthScore(0);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Old Password
            </label>
            <div className="relative">
              <input
                type={showOldPass ? "text" : "password"}
                name="old_password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter old password"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showOldPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                name="new_password"
                value={newPassword}
                onChange={handleNewPasswordChange}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPass ? "Hide" : "Show"}
              </button>
            </div>
            {newPassword && (
              <div className="mt-2">
                <p
                  className="text-sm font-medium"
                  style={{
                    color: ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22c55e"][strengthScore],
                  }}
                >
                  Password Strength: {["Very Weak", "Weak", "Fair", "Good", "Strong"][strengthScore]}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(strengthScore + 1) * 20}%`,
                      backgroundColor: ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22c55e"][strengthScore],
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 text-white font-semibold py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            Change Password
          </button>
        </form>
      </section>

    </>
  );
}