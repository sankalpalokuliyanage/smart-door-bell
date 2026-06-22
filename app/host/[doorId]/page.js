'use client';
import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';

export default function HostCall({ params }) {
  const { doorId } = params;
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const currentCallRef = useRef(null);
  const localStreamRef = useRef(null);
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState('');
  const [callActive, setCallActive] = useState(false);

  useEffect(() => {
    if (!doorId) return;

    const peer = new Peer(doorId);
    peerRef.current = peer;
    setStatus('waiting for call');
    setError('');

    const cleanupLocalStream = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };

    const cleanupCall = () => {
      if (currentCallRef.current) {
        currentCallRef.current.close();
        currentCallRef.current = null;
      }
      setCallActive(false);
      cleanupLocalStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };

    peer.on('open', () => {
      setStatus('ready to receive call');
    });

    peer.on('call', (call) => {
      setStatus('incoming call');
      setError('');

      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          call.answer(stream);
          currentCallRef.current = call;
          setCallActive(true);

          call.on('stream', (remoteStream) => {
            setStatus('connected');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });

          call.on('close', () => {
            setStatus('call ended');
            cleanupCall();
          });

          call.on('error', (err) => {
            setError(err?.message || 'Call error');
            cleanupCall();
          });
        })
        .catch((err) => {
          setError('Unable to get camera or microphone.');
          console.error('Host media error:', err);
        });
    });

    peer.on('error', (err) => {
      setError(err?.message || 'Peer connection error');
    });

    return () => {
      cleanupCall();
      peer.destroy();
    };
  }, [doorId]);

  const hangUp = () => {
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
      setStatus('call ended');
      setCallActive(false);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 text-slate-950">
      <h1 className="text-3xl font-semibold">Host page for {doorId}</h1>
      <p className="mt-2 text-slate-600">
        Status: <strong>{status}</strong>
      </p>
      {error && <p className="mt-2 text-red-600">Error: {error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-2xl bg-slate-100 px-4 py-2 text-slate-700">Host ID: {doorId}</span>
        {callActive && (
          <button
            className="rounded-2xl bg-red-600 px-4 py-2 text-white"
            onClick={hangUp}
          >
            Hang up
          </button>
        )}
      </div>

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
          <h2 className="text-xl font-medium">Visitor video</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="mt-3 h-[300px] w-full rounded-2xl bg-black object-cover"
          />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-slate-700">
          Open the visitor page at <code className="rounded bg-white px-2 py-1">/call/{doorId}</code> or scan the QR from admin.
        </p>
      </div>
    </div>
  );
}
