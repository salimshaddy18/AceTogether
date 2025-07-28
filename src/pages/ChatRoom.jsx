import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  setDoc,
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

    //parse chatId to get the other user's UID
    const [uid1, uid2] = chatId.split("_");
    const otherUid = user.uid === uid1 ? uid2 : uid1;

    //get other user's profile
    const fetchOtherUser = async () => {
      const otherUserDoc = await getDoc(doc(db, "users", otherUid));
      if (otherUserDoc.exists()) {
        setOtherUser(otherUserDoc.data());
      }
    };
    fetchOtherUser();

    //listen
    const unsub = onSnapshot(doc(db, "chats", chatId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMessages(data.messages || []);
      } else {
        //create new chat document if it doesn't exist
        setDoc(doc(db, "chats", chatId), {
          participants: [uid1, uid2],
          messages: [],
          lastMessage: "",
          lastMessageTime: null,
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [chatId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const messageData = {
      id: Date.now().toString(),
      senderId: auth.currentUser.uid,
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    try {
      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion(messageData),
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(), // This is fine for the chat document
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) return <div className="p-4">Loading chat...</div>;
  if (!otherUser) return <div className="p-4">User not found.</div>;

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col">
      {/* chat box header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden">
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
          <div className="font-semibold">{otherUser.fullName}</div>
          <div className="text-sm text-gray-500">Online</div>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
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
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800 border"
                }`}
              >
                <div className="text-sm">{message.text}</div>
                {message.timestamp && (
                  <div
                    className={`text-xs mt-1 ${
                      message.senderId === auth.currentUser?.uid
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(message.timestamp.toDate()).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* taking message input */}
      <form onSubmit={sendMessage} className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatRoom;
