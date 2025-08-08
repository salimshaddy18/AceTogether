import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const [user, setUser] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const navigate = useNavigate();

  // fetch current logged-in user's data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (!userAuth) {
        navigate("/login");
      } else {
        const docRef = doc(db, "users", userAuth.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = { uid: userAuth.uid, ...docSnap.data() };
          setUser(userData);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // listen to connection requests for notification badge
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const requests = docSnap.data().connectionRequestsReceived || [];
        const pendingCount = requests.filter(
          (req) => req.status === "pending"
        ).length;
        setPendingRequestsCount(pendingCount);
      }
    });

    return () => unsub();
  }, []);

  // listen for unread messages (chats with new messages)
  useEffect(() => {
    if (!user || !user.connections || !user.lastSeenChats) return;

    const checkUnreadChats = async () => {
      let count = 0;

      await Promise.all(
        user.connections.map(async (connectionId) => {
          const chatId =
            user.uid < connectionId
              ? `${user.uid}_${connectionId}`
              : `${connectionId}_${user.uid}`;

          const lastSeen = user.lastSeenChats?.[chatId]?.toMillis?.() || 0;

          const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("timestamp", "desc"),
            where("timestamp", ">", new Date(lastSeen))
          );

          const snapshot = await getDocs(q);
          if (!snapshot.empty) count += 1;
        })
      );

      setUnreadChatsCount(count);
    };

    checkUnreadChats();
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">👋 Welcome, {user?.fullName}</h1>

      <button
        onClick={() => navigate("/Dashboard")}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        User Profile
      </button>

      <div className="relative inline-block">
        <Link to="/requests" className="inline-flex items-center">
          Connection Requests
          {pendingRequestsCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {pendingRequestsCount}
            </span>
          )}
        </Link>
      </div>

      {/* Stats & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow space-y-2">
          <h2 className="text-xl font-semibold">📊 Your Stats</h2>
          <p>💰 Credits: {user?.creditPoints || 0}</p>
          <p>⏱️ Study Time: {user?.studyTime || "0 hrs"}</p>
          <p>🤝 Connections: {user?.connections?.length || 0}</p>
        </div>

        <div className="bg-white p-4 rounded shadow space-y-4">
          <h2 className="text-xl font-semibold">💡 Quick Actions</h2>
          
          <Link
            to="/find-study-partner"
            className="block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            🤝 Find Partner
          </Link>

          <Link
            to="/buddies"
            className="block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            🧑‍🤝‍🧑 My Study Buddies
          </Link>

          <Link
            to="/joinmeetings"
            className="block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Join meeting
          </Link>

          <div className="relative">
            <Link
              to="/chats"
              className="block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              💬 My Chats
              {unreadChatsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadChatsCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
