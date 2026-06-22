'use client';
import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';

export default function HostCall({ params }) {
  const { doorId } = params; // URL එකෙන් දොරේ ID එක ලබාගනී
  const videoRef = useRef(null);
  const [peerInstance, setPeerInstance] = useState(null);

  useEffect(() => {
    // 1. අදාළ දොරේ ID එක හරහා Peer එකක් සෑදීම
    const peer = new Peer(doorId); 

    peer.on('open', (id) => {
      console.log('Host ready with ID:', id);
    });

    // 2. අමුත්තාගෙන් එන ඇමතුම (Call) පිළිගැනීම
    peer.on('call', (call) => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          // අමුත්තාට ඔබේ වීඩියෝව යැවීම
          call.answer(stream); 
          
          // අමුත්තාගේ වීඩියෝව ඔබේ තිරයේ පෙන්වීම
          call.on('stream', (remoteStream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = remoteStream;
            }
          });
        })
        .catch((err) => {
          console.error("Failed to get local stream", err);
        });
    });

    setPeerInstance(peer);

    // Clean up
    return () => {
      peer.destroy();
    };
  }, [doorId]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>{doorId} දොරේ ඇමතුම් බලා සිටී...</h1>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        style={{ width: '80%', border: '2px solid black' }} 
      />
    </div>
  );
}