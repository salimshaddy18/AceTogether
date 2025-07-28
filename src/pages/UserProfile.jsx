import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

const UserProfile = () => {
  const { uid } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const targetUid = uid || auth.currentUser?.uid;
      if (!targetUid) return;

      const userDoc = await getDoc(doc(db, "users", targetUid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
        setIsCurrentUser(!uid || uid === auth.currentUser?.uid);
      }
      setLoading(false);
    };
    fetchUser();
  }, [uid]);

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
        <strong>Availability:</strong> {userData.availability || "Not set"}
      </p>
      <p>
        <strong>Goals:</strong> {userData.goals || "Not set"}
      </p>
      <p>
        <strong>Preferred Study Type:</strong> {userData.prefers || "Not set"}
      </p>
      <p>
        <strong>Teaches:</strong> {userData.teaches?.join(", ") || "None"}
      </p>
      <p>
        <strong>Credit Points:</strong> {userData.creditPoints}
      </p>
      {userData.bio && (
        <p>
          <strong>Bio:</strong> {userData.bio}
        </p>
      )}

      {isCurrentUser && (
        <div className="flex gap-2 mt-4">
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
        </div>
      )}
    </div>
  );
};

export default UserProfile;
