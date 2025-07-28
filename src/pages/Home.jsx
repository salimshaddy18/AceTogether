import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  //fetch current logged-in user's data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (!userAuth) {
        navigate("/login");
      } else {
        const docRef = doc(db, "users", userAuth.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUser({ uid: userAuth.uid, ...docSnap.data() });
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (!user) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">👋 Welcome, {user.fullName}</h1>
      <p className="text-gray-600">
        Bio: {user.bio?.trim() ? user.bio : "No bio yet"}
      </p>

      <button
        onClick={() => navigate("/Dashboard")}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        User Profile
      </button>

      <Link to="/requests">Connection Requests</Link>

      {/* Stats & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow space-y-2">
          <h2 className="text-xl font-semibold">📊 Your Stats</h2>
          <p>💰 Credits: {user.creditPoints || 0}</p>
          <p>⏱️ Study Time: {user.studyTime || "0h this week"}</p>
          <p>🤝 Connections: {user.connections?.length || 0}</p>
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
            to="/chats"
            className="block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            💬 My Chats
          </Link>
          <Link
            to="/learn"
            className="block bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            🎓 Learn Session
          </Link>
          <Link
            to="/teach"
            className="block bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            🎓 Teach Session
          </Link>
          <Link
            to="/leaderboard"
            className="block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            🏆 View Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
