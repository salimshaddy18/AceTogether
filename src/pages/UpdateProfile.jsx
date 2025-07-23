import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const UpdateProfile = () => {
  const [form, setForm] = useState({
    subjects: "",
    availability: "",
    goals: "",
    prefers: "",
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setForm({
            subjects: data.subjects?.join(", ") || "",
            availability: data.availability || "",
            goals: data.goals || "",
            prefers: data.prefers || "",
          });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        subjects: form.subjects.split(",").map((s) => s.trim()),
        availability: form.availability,
        goals: form.goals,
        prefers: form.prefers,
      });
      alert("Profile updated!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">📝 Update Your Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Subjects (comma separated)</label>
          <input
            type="text"
            name="subjects"
            value={form.subjects}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="e.g. DSA, OS"
          />
        </div>

        <div>
          <label>Availability</label>
          <input
            type="text"
            name="availability"
            value={form.availability}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="e.g. Weekdays 6-9 PM"
          />
        </div>

        <div>
          <label>Study Goals</label>
          <textarea
            name="goals"
            value={form.goals}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            rows={3}
          />
        </div>

        <div>
          <label>Preferred Study Type</label>
          <select
            name="prefers"
            value={form.prefers}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select</option>
            <option value="one on one">one on one</option>
            <option value="Group">group</option>
          </select>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default UpdateProfile;
