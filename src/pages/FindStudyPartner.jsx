import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthContext } from "../context/AuthContext";

const FindStudyPartner = () => {
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState("");
  const [availability, setAvailability] = useState("");
  const [users, setUsers] = useState([]);

  const { user: currentUser } = useAuthContext(); // assuming you store logged-in user

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      let q = usersRef;

      const filters = [];
      if (subject) filters.push(where("subjects", "array-contains", subject));
      if (mode) filters.push(where("prefers", "==", mode));
      if (availability) filters.push(where("availability", "==", availability));

      if (filters.length > 0) {
        q = query(usersRef, ...filters);
      }

      const snapshot = await getDocs(q);
      const matchedUsers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.id !== currentUser?.uid); // Exclude self

      setUsers(matchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [subject, mode, availability]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4 text-center">🤝 Find Study Partners</h2>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Subject (e.g. DSA)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">Mode</option>
          <option value="one on one">One on One</option>
          <option value="group">Group</option>
        </select>
        <input
          type="text"
          placeholder="Availability (e.g. Evenings)"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      {users.length === 0 ? (
        <p className="text-center text-gray-500">No matching users found.</p>
      ) : (
        <div className="grid gap-4">
          {users.map((user, idx) => (
            <div key={idx} className="border p-4 rounded shadow bg-white">
              <h3 className="text-lg font-bold">{user.fullName}</h3>
              <p>Subjects: {user.subjects?.join(", ")}</p>
              <p>Availability: {user.availability}</p>
              <p>Prefers: {user.prefers}</p>
              <button className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded">
                Connect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FindStudyPartner;
