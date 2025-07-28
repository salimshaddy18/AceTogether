import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";

const MyStudyBuddies = () => {
  const [buddies, setBuddies] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">My Study Buddies</h2>
      {buddies.length === 0 ? (
        <p>You have no study buddies yet.</p>
      ) : (
        <div className="grid gap-4">
          {buddies.map((buddy) => (
            <Link
              key={buddy.uid}
              to={`/profile/${buddy.uid}`}
              className="no-underline text-inherit"
            >
              <div className="flex items-center gap-4 p-4 border rounded shadow bg-white hover:bg-blue-50 cursor-pointer">
                {/* Placeholder avatar: use initials or emoji */}
                <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-xl font-bold overflow-hidden">
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
                  <div className="font-semibold text-lg">{buddy.fullName}</div>
                  <div className="text-gray-500 text-sm">{buddy.email}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyStudyBuddies;
