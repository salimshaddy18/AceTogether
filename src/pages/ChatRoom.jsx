import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot as onCollectionSnapshot,
} from "firebase/firestore";

const ChatRoom = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !chatId) return;

    const [uid1, uid2] = chatId.split("_");
    const otherUid = user.uid === uid1 ? uid2 : uid1;

    const fetchOtherUser = async () => {
      const otherUserDoc = await getDoc(doc(db, "users", otherUid));
      if (otherUserDoc.exists()) {
        setOtherUser(otherUserDoc.data());
      }
    };
    fetchOtherUser();

    const unsubChat = onSnapshot(doc(db, "chats", chatId), (docSnap) => {
      if (!docSnap.exists()) {
        setDoc(doc(db, "chats", chatId), {
          participants: [uid1, uid2],
          lastMessage: "",
          lastMessageTime: null,
        });
      }
    });

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubMessages = onCollectionSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => {
      unsubChat();
      unsubMessages();
    };
  }, [chatId]);

  useEffect(() => {
    if (auth.currentUser && chatId && messages.length > 0) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      updateDoc(userRef, {
        [`lastSeenChats.${chatId}`]: serverTimestamp(),
      });
    }
  }, [chatId, messages.length]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: auth.currentUser.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: auth.currentUser.uid,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) return <div className="p-4 text-gray-300">Loading chat...</div>;
  if (!otherUser) return <div className="p-4 text-gray-300">User not found.</div>;

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-300 hover:text-white transition"
        >
          ← Back
        </button>
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
          {otherUser.avatarUrl ? (
            <img
              src={otherUser.avatarUrl}
              alt="avatar"
              className="object-cover w-full h-full"
            />
          ) : otherUser.fullName ? (
            otherUser.fullName[0].toUpperCase()
          ) : (
            "👤"
          )}
        </div>
        <div>
          <div className="font-semibold text-gray-100">{otherUser.fullName}</div>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === auth.currentUser?.uid
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === auth.currentUser?.uid
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                <div className="text-sm">{message.text}</div>
                {message.timestamp && (
                  <div
                    className={`text-xs mt-1 ${
                      message.senderId === auth.currentUser?.uid
                        ? "text-blue-200"
                        : "text-gray-400"
                    }`}
                  >
                    {message.timestamp.toDate
                      ? new Date(message.timestamp.toDate()).toLocaleTimeString()
                      : ""}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* input */}
      <form onSubmit={sendMessage} className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatRoom;
