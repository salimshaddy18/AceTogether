import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  doc as firestoreDoc,
  getDoc as firestoreGetDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

const ConnectionRequests = () => {
  const [user] = useAuthState(auth);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        let requests = docSnap.data().connectionRequestsReceived || [];
        // Fetch user info if not present
        requests = await Promise.all(
          requests.map(async (req) => {
            if (req.name && req.avatarUrl !== undefined) return req;
            const senderDoc = await firestoreGetDoc(
              firestoreDoc(db, "users", req.userId)
            );
            return {
              ...req,
              name: senderDoc.exists() ? senderDoc.data().fullName : req.userId,
              avatarUrl: senderDoc.exists()
                ? senderDoc.data().avatarUrl || ""
                : "",
              isNew: req.isNew !== false, // Mark as new if not explicitly marked as read
            };
          })
        );
        setReceivedRequests(requests);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Mark requests as read when page is viewed
  useEffect(() => {
    if (receivedRequests.length > 0 && user) {
      const markAsRead = async () => {
        const updatedRequests = receivedRequests.map((req) => ({
          ...req,
          isNew: false,
        }));
        try {
          await updateDoc(doc(db, "users", user.uid), {
            connectionRequestsReceived: updatedRequests,
          });
        } catch (error) {
          console.error("Error marking requests as read:", error);
        }
      };
      markAsRead();
    }
  }, [receivedRequests, user]);

  const handleRequestResponse = async (senderId, action) => {
    const newStatus = action === "accept" ? "accepted" : "rejected";

    try {
      const receiverRef = doc(db, "users", user.uid);
      const receiverSnap = await getDoc(receiverRef);
      const receiverData = receiverSnap.data();

      // Remove the request from received (receiver) by userId and status
      const updatedReceived = (
        receiverData.connectionRequestsReceived || []
      ).filter((req) => !(req.userId === senderId && req.status === "pending"));

      const senderRef = doc(db, "users", senderId);
      const senderSnap = await getDoc(senderRef);
      const senderData = senderSnap.data();

      // Remove the request from sent (sender) by userId and status
      const updatedSent = (senderData.connectionRequestsSent || []).filter(
        (req) => !(req.userId === user.uid && req.status === "pending")
      );

      const updateOps = [
        updateDoc(receiverRef, {
          connectionRequestsReceived: updatedReceived,
        }),
        updateDoc(senderRef, {
          connectionRequestsSent: updatedSent,
        }),
      ];

      // If accepted, update `connections` for both users
      if (newStatus === "accepted") {
        const receiverConnections = new Set(receiverData.connections || []);
        const senderConnections = new Set(senderData.connections || []);

        receiverConnections.add(senderId);
        senderConnections.add(user.uid);

        updateOps.push(
          updateDoc(receiverRef, {
            connections: Array.from(receiverConnections),
          }),
          updateDoc(senderRef, { connections: Array.from(senderConnections) })
        );
      }

      await Promise.all(updateOps);
      setReceivedRequests(updatedReceived);
    } catch (error) {
      console.error("Failed to update request:", error);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Connection Requests</h2>
      {receivedRequests.filter((req) => req.status === "pending").length ===
      0 ? (
        <p>No connection requests.</p>
      ) : (
        receivedRequests
          .filter((req) => req.status === "pending")
          .map((req) => (
            <div
              key={req.userId}
              className={`border rounded p-4 mb-3 shadow-sm bg-white flex items-center gap-4 ${
                req.isNew ? "border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden">
                {req.avatarUrl ? (
                  <img
                    src={req.avatarUrl}
                    alt="avatar"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{req.name}</div>
                  {req.isNew && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      New
                    </span>
                  )}
                </div>
                {/* Optionally show email if available: {req.email && <div className="text-gray-500 text-sm">{req.email}</div>} */}
                <div>
                  <strong>Status:</strong> {req.status}
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      className="px-4 py-1 bg-green-500 text-white rounded"
                      onClick={() =>
                        handleRequestResponse(req.userId, "accept")
                      }
                    >
                      Accept
                    </button>
                    <button
                      className="px-4 py-1 bg-red-500 text-white rounded"
                      onClick={() =>
                        handleRequestResponse(req.userId, "reject")
                      }
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
      )}
    </div>
  );
};

export default ConnectionRequests;
