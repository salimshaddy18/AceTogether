import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

const UserProfile = () => {
  const { uid } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      const targetUid = uid || currentUser?.uid;
      if (!targetUid || !currentUser) return;

      const userDoc = await getDoc(doc(db, "users", targetUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setIsCurrentUser(targetUid === currentUser.uid);
      }

      setLoading(false);
    };
    fetchUser();
  }, [uid]);

  // Chat button click
  const handleChat = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !uid) return;

    const usersArr = [currentUser.uid, uid].sort();
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
  if (!userData) return <div className="p-4 text-red-400">User not found.</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-xl mx-auto bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden mb-3">
            {userData.avatarUrl ? (
              <img
                src={userData.avatarUrl}
                alt="avatar"
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-4xl">👤</span>
            )}
          </div>
          <h2 className="text-2xl font-bold">
            👤 {isCurrentUser ? "Your Profile" : userData.fullName}
          </h2>
        </div>

        {/* Details */}
        <div className="space-y-2 text-gray-300">
          <p>
            <strong className="text-gray-200">Full Name:</strong>{" "}
            {userData.fullName}
          </p>
          <p>
            <strong className="text-gray-200">Email:</strong> {userData.email}
          </p>
          <p>
            <strong className="text-gray-200">Subjects:</strong>{" "}
            {userData.subjects?.join(", ") || "Not set"}
          </p>
          <p>
            <strong className="text-gray-200">Availability:</strong>{" "}
            {Array.isArray(userData.availability)
              ? userData.availability.join(", ")
              : "Not set"}
          </p>
          <p>
            <strong className="text-gray-200">Goals:</strong>{" "}
            {userData.goals || "Not set"}
          </p>
          <p>
            <strong className="text-gray-200">Preferred Study Type:</strong>{" "}
            {userData.prefers || "Not set"}
          </p>
          <p>
            <strong className="text-gray-200">Bio:</strong>{" "}
            {userData.bio || "Not set"}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6 flex-wrap">
          {isCurrentUser ? (
            <>
              <Link
                to="/update-profile"
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg shadow text-white transition"
              >
                ✏️ Update Profile
              </Link>
              <button
                onClick={() => auth.signOut().then(() => navigate("/login"))}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg shadow text-white transition"
              >
                🚪 Logout
              </button>
            </>
          ) : (
            <button
              onClick={handleChat}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow text-white transition"
            >
              💬 Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
