import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

function randomID(len) {
  let result = "";
  const chars =
    "1234567890qwertyuiopasdfghjklmnbvcxzQWERTYUIOPASDFGHJKLZXCVBNM";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getUrlParams(url = window.location.href) {
  let urlStr = url.split("?")[1];
  return new URLSearchParams(urlStr);
}

export default function VideoConference() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const zpRef = useRef(null); // to keep reference of Zego instance

  // fetching user
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

  useEffect(() => {
    if (!user || !containerRef.current) return;

    const roomID = getUrlParams().get("roomID") || randomID(5);

    const appID = Number(import.meta.env.VITE_ZEGOCLOUD_APPID);
    const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVERSECRET;

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomID,
      user.uid,
      user.fullName || "Guest"
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zpRef.current = zp;

    zp.joinRoom({
      container: containerRef.current,
      sharedLinks: [
        {
          name: "Personal link",
          url:
            window.location.protocol +
            "//" +
            window.location.host +
            window.location.pathname +
            "?roomID=" +
            roomID,
        },
      ],
      scenario: {
        mode: ZegoUIKitPrebuilt.VideoConference,
      },
    });

    // cleanup on unmount
    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, [user]);

  return (
    <div
      ref={containerRef}
      className="myCallContainer"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
