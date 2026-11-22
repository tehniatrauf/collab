import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "../context/authcontext"; // Ensure this matches your file name exactly
import { useToast } from "../context/ToastContext";
import { Camera, Save } from "lucide-react";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const fileRef = useRef<HTMLInputElement>(null);
  
  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await updateProfile({ name: name.trim(), avatar: avatar });
      showToast("Profile updated successfully!", "success");
    } catch (err: any) {
      // Show real error message if backend fails
      showToast(err.message || "Could not update profile.", "warning");
    }
  };

  const handleAvatar = (file?: File) => {
    if (!file) return;
    if (file.size > 800 * 1024) {
      showToast("Profile image must be smaller than 800 KB.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Profile Settings</h1>
      <p className="text-slate-500 mb-8">Manage your public profile and avatar.</p>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-brand/10 text-brand flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg overflow-hidden">
                  {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : name.charAt(0) || "U"}
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={(event) => handleAvatar(event.target.files?.[0])} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Profile Picture</h3>
                <p className="text-sm text-slate-500 mb-2">JPG, GIF or PNG. Max size of 800K</p>
                <button type="button" onClick={() => fileRef.current?.click()} className="text-sm font-medium text-brand hover:underline">Upload new image</button>
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1.5">Email cannot be changed.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition shadow-lg shadow-brand/20">
                <Save size={18} /> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}