import { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const UpdateProfile = () => {
  const [form, setForm] = useState({
    subjects: "",
    availability: [],
    goals: "",
    prefers: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setForm({
            subjects: data.subjects?.join(", ") || "",
            availability: Array.isArray(data.availability)
              ? data.availability
              : [],
            goals: data.goals || "",
            prefers: data.prefers || "",
            bio: data.bio || "",
          });
          setAvatarUrl(data.avatarUrl || "");
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvailabilityChange = (day) => {
    const updated = form.availability.includes(day)
      ? form.availability.filter((d) => d !== day)
      : [...form.availability, day];
    setForm({ ...form, availability: updated });
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    let uploadedAvatarUrl = avatarUrl;

    try {
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const avatarRef = ref(storage, `avatars/${user.uid}.${ext}`);
        await uploadBytes(avatarRef, avatarFile, {
          contentType: avatarFile.type,
        });
        uploadedAvatarUrl = await getDownloadURL(avatarRef);
      }

      await updateDoc(doc(db, "users", user.uid), {
        subjects: form.subjects
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        availability: form.availability,
        goals: form.goals,
        prefers: form.prefers,
        bio: form.bio,
        avatarUrl: uploadedAvatarUrl,
      });

      alert("Profile updated!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (loading)
    return <p className="text-center mt-10 text-gray-400">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-xl mx-auto bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        <h2 className="text-2xl font-bold">📝 Update Your Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <label className="mb-2 font-semibold">Profile Picture</label>
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden mb-2">
              {avatarFile ? (
                <img
                  src={URL.createObjectURL(avatarFile)}
                  alt="avatar preview"
                  className="object-cover w-full h-full"
                />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-4xl">👤</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="text-sm text-gray-300"
            />
          </div>

          {/* Subjects */}
          <div>
            <label className="block mb-1 font-medium">Subjects</label>
            <input
              type="text"
              name="subjects"
              value={form.subjects}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. DSA, OS"
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block mb-2 font-medium">
              Availability (select weekdays)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {weekdays.map((day) => (
                <label key={day} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.availability.includes(day)}
                    onChange={() => handleAvailabilityChange(day)}
                    className="accent-blue-500"
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div>
            <label className="block mb-1 font-medium">Study Goals</label>
            <textarea
              name="goals"
              value={form.goals}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Preferred Study Type */}
          <div>
            <label className="block mb-1 font-medium">
              Preferred Study Type
            </label>
            <select
              name="prefers"
              value={form.prefers}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="one on one">One on one</option>
              <option value="group">Group</option>
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="block mb-1 font-medium">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Tell others about yourself..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow transition"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;
