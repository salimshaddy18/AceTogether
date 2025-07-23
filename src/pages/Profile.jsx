import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  if (!userData) return <p className="text-center mt-10">Loading profile...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-4 border rounded shadow space-y-4">
      <h2 className="text-2xl font-bold">👤 Your Profile</h2>
      <p><strong>Full Name:</strong> {userData.fullName}</p>
      <p><strong>Email:</strong> {userData.email}</p>
      <p><strong>Subjects:</strong> {userData.subjects.join(", ") || "Not set"}</p>
      <p><strong>Availability:</strong> {userData.availability || "Not set"}</p>
      <p><strong>Goals:</strong> {userData.goals || "Not set"}</p>
      <p><strong>Preferred Study Type:</strong> {userData.prefers || "Not set"}</p>
      <p><strong>Teaches:</strong> {userData.teaches.join(", ") || "None"}</p>
      <p><strong>Credit Points:</strong> {userData.creditPoints}</p>
      <Link to="/update-profile"
        className="inline-block mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Update Profile
      </Link>
    </div>
  );
};

export default Dashboard;
