import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  doc as firestoreDoc,
  getDoc as firestoreGetDoc,
  addDoc, 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
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
              isNew: req.isNew !== false,
            };
          })
        );
        setReceivedRequests(requests);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

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

      const updatedReceived = (
        receiverData.connectionRequestsReceived || []
      ).filter((req) => !(req.userId === senderId && req.status === "pending"));

      const senderRef = doc(db, "users", senderId);
      const senderSnap = await getDoc(senderRef);
      const senderData = senderSnap.data();

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

        const usersArr = [user.uid, senderId].sort();
        try {
          const connRef = collection(db, "connections");
          const q = query(
            connRef,
            where("users", "==", usersArr),
            where("status", "==", "accepted")
          );
          const connSnap = await getDocs(q);
          if (connSnap.empty) {
            const connDoc = {
              users: usersArr,
              status: "accepted",
              createdAt: serverTimestamp(),
              userInfo: {
                [user.uid]: {
                  name: receiverData.fullName || "",
                  avatarUrl: receiverData.avatarUrl || "",
                },
                [senderId]: {
                  name: senderData.fullName || "",
                  avatarUrl: senderData.avatarUrl || "",
                },
              },
            };
            await addDoc(connRef, connDoc);
          }
        } catch (e) {
          console.error("Failed to create connection document:", e);
        }
      }

      await Promise.all(updateOps);
      setReceivedRequests(updatedReceived);
    } catch (error) {
      console.error("Failed to update request:", error);
    }
  };

  if (loading) return <div className="p-4 text-gray-300">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 text-gray-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Connection Requests</h2>
      {receivedRequests.filter((req) => req.status === "pending").length === 0 ? (
        <p className="text-gray-400">No connection requests.</p>
      ) : (
        receivedRequests
          .filter((req) => req.status === "pending")
          .map((req) => (
            <div
              key={req.userId}
              className={`border rounded p-4 mb-3 shadow-sm bg-gray-800 flex items-center gap-4 ${
                req.isNew ? "border-l-4 border-l-blue-500" : "border-gray-700"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
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
                  <div className="font-semibold text-lg">{req.name}</div>
                  {req.isNew && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      New
                    </span>
                  )}
                </div>
                <div className="text-gray-400">
                  <strong>Status:</strong> {req.status}
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                      onClick={() => handleRequestResponse(req.userId, "accept")}
                    >
                      Accept
                    </button>
                    <button
                      className="px-4 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                      onClick={() => handleRequestResponse(req.userId, "reject")}
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
