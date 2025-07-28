import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

const ConnectionRequests = () => {
  const [user] = useAuthState(auth);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setReceivedRequests(data.connectionRequestsReceived || []);
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  //accept or reject a request
  const handleRequestResponse = async (senderId, action) => {
    const newStatus = action === "accept" ? "accepted" : "rejected";

    try {
      //update receiver
      const receiverRef = doc(db, "users", user.uid);
      const receiverSnap = await getDoc(receiverRef);
      const receiverData = receiverSnap.data();
      const updatedReceived = (
        receiverData.connectionRequestsReceived || []
      ).map((req) =>
        req.userId === senderId ? { ...req, status: newStatus } : req
      );
      await updateDoc(receiverRef, {
        connectionRequestsReceived: updatedReceived,
      });

      //update sender
      const senderRef = doc(db, "users", senderId);
      const senderSnap = await getDoc(senderRef);
      const senderData = senderSnap.data();
      const updatedSent = (senderData.connectionRequestsSent || []).map((req) =>
        req.userId === user.uid ? { ...req, status: newStatus } : req
      );
      await updateDoc(senderRef, {
        connectionRequestsSent: updatedSent,
      });

      setReceivedRequests(updatedReceived);
    } catch (error) {
      console.error("Failed to update request:", error);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Connection Requests</h2>
      {receivedRequests.length === 0 ? (
        <p>No connection requests.</p>
      ) : (
        receivedRequests.map((req) => (
          <div
            key={req.userId}
            className="border rounded p-4 mb-3 shadow-sm bg-white"
          >
            <p>
              <strong>User ID:</strong> {req.userId}
            </p>
            <p>
              <strong>Status:</strong> {req.status}
            </p>
            {req.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <button
                  className="px-4 py-1 bg-green-500 text-white rounded"
                  onClick={() => handleRequestResponse(req.userId, "accept")}
                >
                  Accept
                </button>
                <button
                  className="px-4 py-1 bg-red-500 text-white rounded"
                  onClick={() => handleRequestResponse(req.userId, "reject")}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ConnectionRequests;
