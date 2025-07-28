import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return setLoading(false);

    //listen to users connections and fetch chat data
    const unsub = onSnapshot(doc(db, "users", user.uid), async (userDoc) => {
      if (!userDoc.exists()) return setLoading(false);

      const connections = userDoc.data().connections || [];
      const chatPromises = connections.map(async (buddyUid) => {
        //get partner profile
        const buddyDoc = await getDoc(doc(db, "users", buddyUid));
        if (!buddyDoc.exists()) return null;

        const buddyData = buddyDoc.data();

        // get or create chat document
        const chatId = [user.uid, buddyUid].sort().join("_");
        const chatDoc = await getDoc(doc(db, "chats", chatId));

        let lastMessage = "";
        let lastMessageTime = null;

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          lastMessage = chatData.lastMessage || "";
          lastMessageTime = chatData.lastMessageTime;
        }

        return {
          chatId,
          buddy: {
            uid: buddyUid,
            name: buddyData.fullName,
            avatarUrl: buddyData.avatarUrl || "",
            email: buddyData.email,
          },
          lastMessage,
          lastMessageTime,
        };
      });

      const chatResults = await Promise.all(chatPromises);
      setChats(chatResults.filter((chat) => chat !== null));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="p-4">Loading chats...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">💬 My Chats</h2>
      {chats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No chats yet.</p>
          <p className="text-sm text-gray-400">
            Connect with study buddies to start chatting!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Link
              key={chat.chatId}
              to={`/chat/${chat.chatId}`}
              className="block no-underline text-inherit"
            >
              <div className="flex items-center gap-4 p-4 border rounded shadow bg-white hover:bg-blue-50 cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-xl font-bold overflow-hidden">
                  {chat.buddy.avatarUrl ? (
                    <img
                      src={chat.buddy.avatarUrl}
                      alt="avatar"
                      className="object-cover w-full h-full"
                    />
                  ) : chat.buddy.name ? (
                    chat.buddy.name[0].toUpperCase()
                  ) : (
                    "👤"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-lg truncate">
                    {chat.buddy.name}
                  </div>
                  <div className="text-gray-500 text-sm truncate">
                    {chat.lastMessage || "No messages yet"}
                  </div>
                  {chat.lastMessageTime && (
                    <div className="text-xs text-gray-400">
                      {new Date(chat.lastMessageTime.toDate()).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatList;
