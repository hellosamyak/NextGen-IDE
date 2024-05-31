import React, { useRef, useEffect, useState, useCallback } from 'react';
import useWebSocket from 'react-use-websocket';
import Peer from 'simple-peer';

const SOCKET_URL = 'ws://localhost:8080';

const VideoChat = ({ sharedCode }) => {
  const { sendMessage, lastMessage } = useWebSocket(SOCKET_URL);
  const [peers, setPeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const userVideo = useRef();
  const peersRef = useRef([]);
  const sharedCodeRef = useRef();

  const handleReceiveCall = useCallback((incoming) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: userVideo.current.srcObject,
    });

    peer.on('signal', data => {
      sendMessage(JSON.stringify({ type: 'answer', signal: data, from: incoming.from }));
    });

    peer.on('stream', stream => {
      setPeers(prevPeers => [...prevPeers, { peerID: incoming.from, peer }]);
    });

    peer.signal(incoming.signal);
    peersRef.current.push({ peerID: incoming.from, peer });
  }, [sendMessage]);

  const handleAnswer = useCallback((message) => {
    const item = peersRef.current.find(p => p.peerID === message.from);
    if (item) {
      item.peer.signal(message.signal);
    }
  }, []);

  const handleNewICECandidateMsg = useCallback((incoming) => {
    const candidate = new RTCIceCandidate(incoming.candidate);
    const item = peersRef.current.find(p => p.peerID === incoming.from);
    if (item) {
      item.peer.addIceCandidate(candidate);
    }
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      userVideo.current.srcObject = stream;
      sendMessage(JSON.stringify({ type: 'join' }));
    });

    if (lastMessage !== null) {
      const message = JSON.parse(lastMessage.data);
      switch (message.type) {
        case 'offer':
          handleReceiveCall(message);
          break;
        case 'answer':
          handleAnswer(message);
          break;
        case 'ice-candidate':
          handleNewICECandidateMsg(message);
          break;
        default:
          break;
      }
    }
  }, [lastMessage, handleReceiveCall, handleAnswer, handleNewICECandidateMsg, sendMessage]);

  useEffect(() => {
    if (sharedCodeRef.current) {
      sharedCodeRef.current.innerText = sharedCode;
    }
  }, [sharedCode]);

  const toggleMute = () => {
    const tracks = userVideo.current.srcObject.getAudioTracks();
    tracks.forEach(track => {
      track.enabled = !isMuted;
    });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    const tracks = userVideo.current.srcObject.getVideoTracks();
    tracks.forEach(track => {
      track.enabled = !isCameraOff;
    });
    setIsCameraOff(!isCameraOff);
  };

  const downloadSharedCode = () => {
    const element = document.createElement("a");
    const file = new Blob([sharedCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "sharedCode.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex flex-col items-center p-4">
        <h2 className="text-lg font-semibold mb-2">Your Video</h2>
        <video ref={userVideo} autoPlay playsInline className="w-full max-w-md h-auto rounded-lg shadow-lg" muted={isMuted} />
        <div className="mt-2 flex space-x-2">
          <button onClick={toggleMute} className=" hover:bg-blue-300 font-bold py-2 px-4 p-5 border-2 border-black z-10 rounded-md shadow-[5px_5px_0px_0px_rgba(0,0,0)]">
            {isMuted ? 'Unmute Audio' : 'Mute Audio'}
          </button>
          <button onClick={toggleCamera} className=" hover:bg-green-300  font-bold py-2 px-4 p-5 border-2 border-black z-10 rounded-md shadow-[5px_5px_0px_0px_rgba(0,0,0)]">
            {isCameraOff ? 'Turn Camera off' : 'Turn Camera On'}
          </button>
        </div>
      </div>
      <div className="w-full flex flex-col items-center p-4">
        <h2 className="text-lg font-semibold mb-2">Participants' Videos</h2>
        <div className="flex flex-wrap justify-center">
          {peers.map(peer => (
            <div key={peer.peerID} className="w-full sm:w-1/2 lg:w-1/3 p-2">
              <Video peer={peer.peer} />
            </div>
          ))}
        </div>
      </div>
      <div className="w-full flex flex-col items-center p-4">
        <h2 className="text-lg font-semibold mb-2">Shared Code</h2>
        <pre ref={sharedCodeRef} className="bg-gray-100 p-4 rounded-lg shadow-lg overflow-auto w-full max-w-3xl">{sharedCode}</pre>
        <button onClick={downloadSharedCode} className="mt-5 font-bold py-2 px-4 p-5 hover:bg-green-400 border-2 border-black z-10 rounded-md shadow-[5px_5px_0px_0px_rgba(0,0,0)]">
          Download Shared Code
        </button>
      </div>
    </div>
  );
};

const Video = ({ peer }) => {
  const ref = useRef();

  useEffect(() => {
    peer.on('stream', stream => {
      ref.current.srcObject = stream;
    });
  }, [peer]);

  return <video ref={ref} autoPlay playsInline className="w-full h-auto rounded-lg shadow-lg" />;
};

export default VideoChat
