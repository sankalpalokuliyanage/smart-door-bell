import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Peer from 'peerjs';

export default function Call() {
  const router = useRouter();
  const { doorId } = router.query;
  const videoRef = useRef();

  useEffect(() => {
    if (!doorId) return;

    const peer = new Peer();
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        
        // Host (ඔබ) වෙත ඇමතුම යැවීම
        const call = peer.call(doorId, stream);
      });
  }, [doorId]);

  return <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }} />;
}