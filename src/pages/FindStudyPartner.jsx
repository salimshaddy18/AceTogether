import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

const FindStudyPartner = () => {
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState("");
  const [availability, setAvailability] = useState("");
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
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
    const matchedUsers = snapshot.docs.map(doc => doc.data());
    setUsers(matchedUsers);
  };

  useEffect(() => {
    fetchUsers();
  }, [subject, mode, availability]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Find Study Partners</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border p-2 rounded w-1/3"
        >
          <option value="">Mode</option>
          <option value="1:1">1:1</option>
          <option value="group">Group</option>
        </select>
        <input
          type="text"
          placeholder="Availability"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
      </div>

      <div className="grid gap-4">
        {users.map((user, idx) => (
          <div key={idx} className="border p-4 rounded shadow">
            <h3 className="text-lg font-bold">{user.fullName}</h3>
            <p>Subjects: {user.subjects?.join(", ")}</p>
            <p>Availability: {user.availability}</p>
            <p>Prefers: {user.prefers}</p>
            <button className="mt-2 px-3 py-1 bg-blue-500 text-white rounded">
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FindStudyPartner;
