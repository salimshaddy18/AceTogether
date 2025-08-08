// import React from "react";
// import { useParams } from "react-router-dom";
// import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

// const VideoConferenceRooms = () => {
//   const { roomId } = useParams();

//   const myMeetings = async (element) => {
//     const appID = 1598297779;
//     const serverSecret = "2cc45b0576eda7af5a88faf80935c968";
//     const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
//       appID,
//       serverSecret,
//       roomId,
//       randomID(5),
//       "tusharbaskheti"
//     );
//     const zc = ZegoUIKitPrebuilt.create(kitToken);
//     zc.joinRoom({
//         container:element,
//         scenario: {
//             mode: 
//         }
//     })
//   };

//   return <h1>this is call room</h1>;
// };

// export default VideoConferenceRooms;


import * as React from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

function randomID(len) {
  let result = '';
  if (result) return result;
  var chars = '12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP',
    maxPos = chars.length,
    i;
  len = len || 5;
  for (i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

export function getUrlParams(
  url = window.location.href
) {
  let urlStr = url.split('?')[1];
  return new URLSearchParams(urlStr);
}

export default function App() {
  const roomID = getUrlParams().get('roomID') || randomID(5);
  let myMeeting = async (element) => {

 // generate Kit Token
 const appID = 1598297779;
 const serverSecret = "2cc45b0576eda7af5a88faf80935c968";
 const kitToken =  ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID,  randomID(5),  randomID(5));

 // Create instance object from Kit Token.
 const zp = ZegoUIKitPrebuilt.create(kitToken);
 // start the call
 zp.joinRoom({
        container: element,
        sharedLinks: [
          {
            name: 'Personal link',
            url:
             window.location.protocol + '//' + 
             window.location.host + window.location.pathname +
              '?roomID=' +
              roomID,
          },
        ],
        scenario: {
         mode: ZegoUIKitPrebuilt.VideoConference,
        },
   });
  };

  return (
    <div
      className="myCallContainer"
      ref={myMeeting}
      style={{ width: '100vw', height: '100vh' }}
    ></div>
  );
}
