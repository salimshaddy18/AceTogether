import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const navigate = useNavigate();

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
  }, []);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) return;
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const potentialMatches = [];

      snapshot.forEach((docSnap) => {
        const other = docSnap.data();
        if (other.uid !== user.uid) {
          const sharedSubjects = other.subjects?.filter(sub =>
            user.subjects?.includes(sub)
          );
          const matchPercent = Math.floor((sharedSubjects.length / (user.subjects?.length || 1)) * 100);

          if (sharedSubjects.length > 0) {
            potentialMatches.push({ ...other, matchPercent });
          }
        }
      });

      setMatches(potentialMatches.slice(0, 3));
    };

    fetchMatches();
  }, [user]);

  if (!user) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">👋 Welcome, {user.fullName}</h1>
      <p className="text-gray-600">Bio: {user.bio || "No bio yet"}</p>

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
          <Link to="/update-profile" className="block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">🎯 Update Profile</Link>
          <Link to="/find-partner" className="block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">🤝 Find Partner</Link>
          <Link to="/teach" className="block bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">🎓 Teach Session</Link>
          <Link to="/leaderboard" className="block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">🏆 View Leaderboard</Link>
          <button
            onClick={() => auth.signOut().then(() => navigate("/login"))}
            className="block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Recommended Matches */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">🔍 Recommended Study Partners</h2>
        {matches.length === 0 ? (
          <p>No good matches found. Update your subjects.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match, i) => (
              <div key={i} className="border p-4 rounded space-y-2">
                <h3 className="text-lg font-bold">{match.fullName}</h3>
                <p>Subjects: {match.subjects?.join(", ")}</p>
                <p>📊 Match: {match.matchPercent}%</p>
                <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                  Send Request
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
