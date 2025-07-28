import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const MyStudyBuddies = () => {
  const [buddies, setBuddies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);

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

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setConnections(docSnap.data().connections || []);
      }
    });
    return () => unsub();
  }, [auth.currentUser?.uid]);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">My Study Buddies</h2>
      {buddies.length === 0 ? (
        <p>You have no study buddies yet.</p>
      ) : (
        <div className="grid gap-4">
          {buddies.map((buddy) => (
            <div
              key={buddy.uid}
              className="flex items-center gap-4 p-4 border rounded shadow bg-white"
            >
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
          ))}
        </div>
      )}
    </div>
  );
};

export default MyStudyBuddies;
