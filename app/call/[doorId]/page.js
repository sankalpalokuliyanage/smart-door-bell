'use client';

import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';

export default function CallPage({ params }) {
  const { doorId } = params;
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doorId) return;

    const peer = new Peer();
    let localStream = null;
    let currentCall = null;
    let isMounted = true;

    const cleanup = () => {
      if (currentCall) {
        currentCall.close();
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      peer.destroy();
    };

    peer.on('open', () => {
      if (!isMounted) return;
      setStatus('connecting');

      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (!isMounted) return;
          localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          const call = peer.call(doorId, stream);
          currentCall = call;

          call.on('stream', (remoteStream) => {
            if (!isMounted) return;
            setStatus('connected');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });

          call.on('close', () => {
            setStatus('ended');
          });

          call.on('error', (err) => {
            setError(err?.message || 'Call error');
          });
        })
        .catch((err) => {
          setError('Unable to get camera or microphone.');
          console.error('Call media error:', err);
        });
    });

    peer.on('error', (err) => {
      setError(err?.message || 'Peer connection error');
    });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [doorId]);

  return (
    <div className="mx-auto max-w-4xl p-6 text-slate-950">
      <h1 className="text-3xl font-semibold">Calling host: {doorId}</h1>
      <p className="mt-2 text-slate-600">
        Status: <strong>{status}</strong>
      </p>
      {error && <p className="mt-2 text-red-600">Error: {error}</p>}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-medium">Your camera</h2>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="mt-3 h-[300px] w-full rounded-2xl bg-black object-cover"
          />
        </div>
        <div>
          <h2 className="text-xl font-medium">Host video</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="mt-3 h-[300px] w-full rounded-2xl bg-black object-cover"
          />
        </div>
      </div>
    </div>
  );
}
