import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const [user, setUser] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const navigate = useNavigate();

  // check for auth state and the user document
  useEffect(() => {
    let unsubUserDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
        setUser(null);
      } else {
        const userRef = doc(db, "users", firebaseUser.uid);
        unsubUserDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUser({ uid: firebaseUser.uid, ...snap.data() });
          } else {
            setUser({ uid: firebaseUser.uid });
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (typeof unsubUserDoc === "function") unsubUserDoc();
    };
  }, [navigate]);

  // 2) check for connection requests
  useEffect(() => {
    if (!user) {
      setPendingRequestsCount(0);
      return;
    }
    const requests = user.connectionRequestsReceived || [];
    const pending = requests.filter((r) => r.status === "pending").length;
    setPendingRequestsCount(pending);
  }, [user]);

  // helper Function for Timestamps
  const toMillis = (tsOrDate) => {
    if (!tsOrDate) return 0;
    if (typeof tsOrDate.toMillis === "function") return tsOrDate.toMillis();
    if (tsOrDate instanceof Date) return tsOrDate.getTime();
    const asNum = Number(tsOrDate);
    return Number.isFinite(asNum) ? asNum : 0;
  };

  // listen for unread chats
  useEffect(() => {
    if (!user || !user.uid) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubChats = onSnapshot(chatsQuery, (snapshot) => {
      let unreadCount = 0;

      snapshot.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        const chatData = chatDoc.data();

        const lastMsgTs = chatData.lastMessageTime;
        const lastSeenTs = user.lastSeenChats?.[chatId];

        const lastMsgMs = toMillis(lastMsgTs);
        const lastSeenMs = toMillis(lastSeenTs);

        if (
          lastMsgMs > lastSeenMs &&
          chatData.lastMessageSenderId !== user.uid
        ) {
          unreadCount += 1;
        }
      });

      setUnreadChatsCount(unreadCount);
    });

    return () => {
      unsubChats();
    };
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">
        👋 Welcome, {user?.fullName || user?.email || "there"}
      </h1>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/userprofile")}
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
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <button
            onClick={() => {
              const newRoomUrl = "/room"; 
              window.open(newRoomUrl, "_blank");
            }}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            🎥 Join Meeting
          </button>

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
