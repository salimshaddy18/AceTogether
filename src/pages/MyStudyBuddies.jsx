import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

const MyStudyBuddies = () => {
  const [buddies, setBuddies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return setLoading(false);

    const unsub = onSnapshot(doc(db, "users", user.uid), async (userDoc) => {
      if (!userDoc.exists()) return setLoading(false);

      const connections = userDoc.data().connections || [];
      const buddyProfiles = [];
      for (const uid of connections) {
        const buddyDoc = await getDoc(doc(db, "users", uid));
        if (buddyDoc.exists()) {
          buddyProfiles.push({ uid, ...buddyDoc.data() });
        }
      }
      setBuddies(buddyProfiles);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 💬 Handle starting a chat
  const handleChat = async (buddyUid) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const usersArr = [currentUser.uid, buddyUid].sort();
    const chatId = `${usersArr[0]}_${usersArr[1]}`;

    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        participants: usersArr,
        messages: [],
        lastMessage: "",
        lastMessageTime: null,
      });
    }

    navigate(`/chat/${chatId}`);
  };

  if (loading) return <div className="p-4 text-gray-300">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 min-h-screen text-gray-100">
      <h2 className="text-2xl font-bold mb-4">🤝 My Study Buddies</h2>
      {buddies.length === 0 ? (
        <p className="text-gray-400">You have no study buddies yet.</p>
      ) : (
        <div className="grid gap-3">
          {buddies.map((buddy) => (
            <div
              key={buddy.uid}
              className="flex items-center justify-between gap-4 p-4 rounded-lg shadow bg-gray-800 hover:bg-gray-700 transition"
            >
              {/* Buddy info (clickable to profile) */}
              <Link
                to={`/profile/${buddy.uid}`}
                className="flex items-center gap-4 no-underline text-inherit flex-1"
              >
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold overflow-hidden">
                  {buddy.avatarUrl ? (
                    <img
                      src={buddy.avatarUrl}
                      alt="avatar"
                      className="object-cover w-full h-full"
                    />
                  ) : buddy.fullName ? (
                    buddy.fullName[0].toUpperCase()
                  ) : (
                    "👤"
                  )}
                </div>
                <div>
                  <div className="font-semibold text-lg text-gray-100">
                    {buddy.fullName}
                  </div>
                  <div className="text-gray-400 text-sm">{buddy.email}</div>
                </div>
              </Link>

              {/* Chat button */}
              <button
                onClick={() => handleChat(buddy.uid)}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-500 transition"
              >
                💬 Chat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyStudyBuddies;
