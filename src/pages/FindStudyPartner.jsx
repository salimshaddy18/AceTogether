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
      }
    });
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
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

    const baseQuery = query(
      usersRef,
      ...filters,
      orderBy("fullName"),
      limit(PAGE_SIZE),
      ...(lastVisibleDoc ? [startAfter(lastVisibleDoc)] : [])
    );

    return baseQuery;
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
    // Prevent duplicate requests or already-connected users
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const receiverDoc = await getDoc(doc(db, "users", receiverId));
    if (!userDoc.exists() || !receiverDoc.exists()) return;
    const sent = userDoc.data().connectionRequestsSent || [];
    const connections = userDoc.data().connections || [];
    if (
      sent.some((r) => r.userId === receiverId) ||
      connections.includes(receiverId)
    )
      return;
    // Store only the other party's info in each array
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
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        connectionRequestsSent: arrayUnion(receiverInfo), // Only receiver info
      });
      await updateDoc(doc(db, "users", receiverId), {
        connectionRequestsReceived: arrayUnion(senderInfo), // Only sender info
      });
      setSentRequests((prev) => [...prev, receiverId]);
    } catch (error) {
      console.error("Failed to send request:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4 text-center">
        🤝 Find Study Partners
      </h2>

      {/*filters */}
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

      {/*availability */}
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

      {/*matched Users */}
      <InfiniteScroll
        dataLength={users.length}
        next={fetchMoreUsers}
        hasMore={hasMore}
        loader={<p className="text-center text-blue-600">Loading more...</p>}
        endMessage={
          users.length > 0 && (
            <p className="text-center text-gray-500 mt-4">No more users.</p>
          )
        }
      >
        {users.length === 0 ? (
          <p className="text-center text-gray-500">No matching users found.</p>
        ) : (
          <div className="grid gap-4">
            {users.map((user, idx) => (
              <div key={idx} className="border p-4 rounded shadow bg-white">
                <h3 className="text-lg font-bold">{user.fullName}</h3>
                <p>
                  Subjects:{" "}
                  {Array.isArray(user.subjects)
                    ? user.subjects.join(", ")
                    : "—"}
                </p>
                <p>
                  Availability:{" "}
                  {Array.isArray(user.availability)
                    ? user.availability.join(", ")
                    : "—"}
                </p>
                <p>Prefers: {user.prefers || "—"}</p>
                <button
                  disabled={
                    sentRequests.includes(user.id) ||
                    connections.includes(user.id)
                  }
                  onClick={() => handleConnect(user.id)}
                  className={`mt-2 px-4 py-1 rounded ${
                    connections.includes(user.id)
                      ? "bg-green-500 cursor-not-allowed"
                      : sentRequests.includes(user.id)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
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
  );
};

export default FindStudyPartner;
