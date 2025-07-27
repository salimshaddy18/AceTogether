import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthContext } from "../context/AuthContext";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const FindStudyPartner = () => {
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState([]);
  const [users, setUsers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectSuggestions, setSubjectSuggestions] = useState([]);

  const { user: currentUser } = useAuthContext();

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      let q = usersRef;

      const filters = [];

      if (subject) filters.push(where("subjects", "array-contains", subject));
      if (mode) filters.push(where("prefers", "==", mode));
      if (selectedAvailability.length === 1) {
        filters.push(
          where("availability", "array-contains", selectedAvailability[0])
        );
      }

      if (filters.length > 0) {
        q = query(usersRef, ...filters);
      }

      const snapshot = await getDocs(q);
      const matchedUsers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => currentUser?.uid && user.id !== currentUser.uid);

      const finalUsers =
        selectedAvailability.length > 1
          ? matchedUsers.filter((user) =>
              selectedAvailability.every((day) =>
                user.availability?.includes(day)
              )
            )
          : matchedUsers;

      setUsers(finalUsers);
    } catch (error) {
      console.error("🔥 Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [subject, mode, selectedAvailability]);

  useEffect(() => {
    const fetchUniqueSubjects = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const subjectsSet = new Set();

        snapshot.forEach((doc) => {
          const data = doc.data();
          (data.subjects || []).forEach((subj) => subjectsSet.add(subj.trim()));
        });

        setAllSubjects([...subjectsSet]);
      } catch (error) {
        console.error("🔥 Error fetching subjects:", error);
      }
    };

    fetchUniqueSubjects();
  }, []);

  useEffect(() => {
    if (subject) {
      const filtered = allSubjects.filter((s) =>
        s.toLowerCase().startsWith(subject.toLowerCase())
      );
      setSubjectSuggestions(filtered);
    } else {
      setSubjectSuggestions([]);
    }
  }, [subject, allSubjects]);

  const toggleAvailability = (day) => {
    setSelectedAvailability((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4 text-center">
        🤝 Find Study Partners
      </h2>

      {/* filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Subject (e.g. DSA)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border p-2 rounded w-full"
          />
          {subjectSuggestions.length > 0 && (
            <ul className="absolute bg-white border w-full mt-1 z-10 rounded shadow">
              {subjectSuggestions.map((s, idx) => (
                <li
                  key={idx}
                  className="px-3 py-1 hover:bg-gray-200 cursor-pointer"
                  onClick={() => setSubject(s)}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">Mode</option>
          <option value="one on one">One on One</option>
          <option value="group">Group</option>
        </select>
      </div>

      {/* availability */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">Select Availability:</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              onClick={() => toggleAvailability(day)}
              className={`px-3 py-1 border rounded-full ${
                selectedAvailability.includes(day)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* res */}
      {users.length === 0 ? (
        <p className="text-center text-gray-500">No matching users found.</p>
      ) : (
        <div className="grid gap-4">
          {users.map((user, idx) => (
            <div key={idx} className="border p-4 rounded shadow bg-white">
              <h3 className="text-lg font-bold">{user.fullName}</h3>
              <p>Subjects: {user.subjects?.join(", ")}</p>
              <p>Availability: {user.availability?.join(", ")}</p>
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
