import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
} from "firebase/firestore";
import InfiniteScroll from "react-infinite-scroll-component";
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

const PAGE_SIZE = 5;

const FindStudyPartner = () => {
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState([]);
  const [users, setUsers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectSuggestions, setSubjectSuggestions] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [connections, setConnections] = useState([]);

  const { user: currentUser } = useAuthContext();

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setSentRequests(
          (docSnap.data().connectionRequestsSent || []).map((r) => r.userId)
        );
        setConnections(docSnap.data().connections || []);
      }
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const buildQuery = () => {
    const usersRef = collection(db, "users");
    const filters = [];
    if (subject) filters.push(where("subjects", "array-contains", subject));
    if (mode) filters.push(where("prefers", "==", mode));
    if (selectedAvailability.length === 1) {
      filters.push(
        where("availability", "array-contains", selectedAvailability[0])
      );
    }

    return query(
      usersRef,
      ...filters,
      orderBy("fullName"),
      limit(PAGE_SIZE),
      ...(lastVisibleDoc ? [startAfter(lastVisibleDoc)] : [])
    );
  };

  const fetchUsers = async () => {
    try {
      const q = buildQuery();
      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => currentUser?.uid && user.id !== currentUser.uid);

      const finalUsers =
        selectedAvailability.length > 1
          ? fetchedUsers.filter((user) =>
              selectedAvailability.every(
                (day) =>
                  Array.isArray(user.availability) &&
                  user.availability.includes(day)
              )
            )
          : fetchedUsers;

      setUsers(finalUsers);
      setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("🔥 Error fetching users:", error);
    }
  };

  const fetchMoreUsers = async () => {
    try {
      const q = buildQuery();
      const snapshot = await getDocs(q);
      const newUsers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => currentUser?.uid && user.id !== currentUser.uid);

      const finalNewUsers =
        selectedAvailability.length > 1
          ? newUsers.filter((user) =>
              selectedAvailability.every(
                (day) =>
                  Array.isArray(user.availability) &&
                  user.availability.includes(day)
              )
            )
          : newUsers;

      setUsers((prev) => [...prev, ...finalNewUsers]);
      setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to fetch more users:", error);
    }
  };

  useEffect(() => {
    setUsers([]);
    setLastVisibleDoc(null);
    setHasMore(true);
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

  const handleConnect = async (receiverId) => {
    if (!currentUser?.uid || !receiverId) return;
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const receiverDoc = await getDoc(doc(db, "users", receiverId));
      if (!userDoc.exists() || !receiverDoc.exists()) return;

      const sent = userDoc.data().connectionRequestsSent || [];
      const connected = userDoc.data().connections || [];

      if (
        sent.some((r) => r.userId === receiverId) ||
        connected.includes(receiverId)
      )
        return;

      const senderInfo = {
        userId: currentUser.uid,
        name: userDoc.data().fullName,
        avatarUrl: userDoc.data().avatarUrl || "",
        status: "pending",
      };
      const receiverInfo = {
        userId: receiverDoc.id,
        name: receiverDoc.data().fullName,
        avatarUrl: receiverDoc.data().avatarUrl || "",
        status: "pending",
      };

      await updateDoc(doc(db, "users", currentUser.uid), {
        connectionRequestsSent: arrayUnion(receiverInfo),
      });
      await updateDoc(doc(db, "users", receiverId), {
        connectionRequestsReceived: arrayUnion(senderInfo),
      });

      setSentRequests((prev) => [...prev, receiverId]);
    } catch (error) {
      console.error("Failed to send request:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center text-blue-400">
          🤝 Find Study Partners
        </h2>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {subjectSuggestions.length > 0 && (
              <ul className="absolute bg-gray-800 border border-gray-700 w-full mt-1 rounded-lg shadow-lg z-10">
                {subjectSuggestions.map((s, idx) => (
                  <li
                    key={idx}
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer"
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
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Mode</option>
            <option value="one on one">One on One</option>
            <option value="group">Group</option>
          </select>
        </div>

        {/* Availability */}
        <div className="mb-8">
          <label className="block font-semibold mb-3 text-gray-300">
            Select Availability:
          </label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                onClick={() => toggleAvailability(day)}
                className={`px-4 py-2 rounded-full border transition ${
                  selectedAvailability.includes(day)
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <InfiniteScroll
          dataLength={users.length}
          next={fetchMoreUsers}
          hasMore={hasMore}
          loader={
            <p className="text-center text-blue-400">Loading more...</p>
          }
          endMessage={
            users.length > 0 && (
              <p className="text-center text-gray-500 mt-4">
                No more users found.
              </p>
            )
          }
        >
          {users.length === 0 ? (
            <p className="text-center text-gray-500">
              No matching users found.
            </p>
          ) : (
            <div className="grid gap-6">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-md hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold text-blue-300">
                    {user.fullName}
                  </h3>
                  <p className="text-gray-400">
                    Subjects:{" "}
                    {Array.isArray(user.subjects)
                      ? user.subjects.join(", ")
                      : "—"}
                  </p>
                  <p className="text-gray-400">
                    Availability:{" "}
                    {Array.isArray(user.availability)
                      ? user.availability.join(", ")
                      : "—"}
                  </p>
                  <p className="text-gray-400">
                    Prefers: {user.prefers || "—"}
                  </p>

                  <button
                    disabled={
                      sentRequests.includes(user.id) ||
                      connections.includes(user.id)
                    }
                    onClick={() => handleConnect(user.id)}
                    className={`mt-4 px-5 py-2 rounded-lg font-medium transition ${
                      connections.includes(user.id)
                        ? "bg-green-600 cursor-not-allowed text-white"
                        : sentRequests.includes(user.id)
                        ? "bg-gray-600 cursor-not-allowed text-gray-300"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    {connections.includes(user.id)
                      ? "Connected"
                      : sentRequests.includes(user.id)
                      ? "Requested"
                      : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </InfiniteScroll>
      </div>
    </div>
  );
};

export default FindStudyPartner;
