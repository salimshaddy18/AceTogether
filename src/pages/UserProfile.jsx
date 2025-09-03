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

  if (loading) return <div className="p-4">Loading...</div>;
  if (!userData) return <div className="p-4">User not found.</div>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-4 border rounded shadow space-y-4">
      <div className="flex flex-col items-center mb-4">
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-2">
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
      </div>

      <h2 className="text-2xl font-bold">
        👤 {isCurrentUser ? "Your Profile" : userData.fullName}
      </h2>

      <p>
        <strong>Full Name:</strong> {userData.fullName}
      </p>
      <p>
        <strong>Email:</strong> {userData.email}
      </p>
      <p>
        <strong>Subjects:</strong> {userData.subjects?.join(", ") || "Not set"}
      </p>
      <p>
        <strong>Availability:</strong>{" "}
        {Array.isArray(userData.availability)
          ? userData.availability.join(", ")
          : "Not set"}
      </p>
      <p>
        <strong>Goals:</strong> {userData.goals || "Not set"}
      </p>
      <p>
        <strong>Preferred Study Type:</strong> {userData.prefers || "Not set"}
      </p>
      <p>
        <strong>Bio:</strong> {userData.bio || "Not set"}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {isCurrentUser ? (
          <>
            <Link
              to="/update-profile"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Update Profile
            </Link>
            <button
              onClick={() => auth.signOut().then(() => navigate("/login"))}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              🚪 Logout
            </button>
          </>
        ) : (
          <button
            onClick={handleChat}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            💬 Chat
          </button>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
