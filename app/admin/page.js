'use client';

import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';

function sanitizeForId(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function generateUniqueId(name, address) {
  let baseId = `${sanitizeForId(name)}_${sanitizeForId(address)}`;
  if (!baseId) baseId = `door_${Math.random().toString(36).slice(2, 6)}`;
  let finalId = baseId;
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('unique_door_id')
      .eq('unique_door_id', finalId)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    finalId = `${baseId}_${counter}`;
    counter++;
  }
  return finalId;
}

export default function AdminPage() {
  const [doorId, setDoorId] = useState('');
  const [origin, setOrigin] = useState('http://localhost:3000');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
    // load current user and subscribe to auth changes (guard when supabase not configured)
    (async () => {
      try {
        if (supabase && supabase.auth && typeof supabase.auth.getUser === 'function') {
          const res = await supabase.auth.getUser();
          setUser(res?.data?.user ?? null);
        }
      } catch (e) {
        console.warn('Supabase getUser failed', e);
      }
    })();

    let unsub = null;
    if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      }) || {};
      if (data && data.subscription && typeof data.subscription.unsubscribe === 'function') {
        unsub = () => data.subscription.unsubscribe();
      }
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  async function saveUserProfile() {
    try {
      setLoading(true);

      const authRes = await supabase.auth.getUser();
      const currentUser = authRes?.data?.user ?? user;
      if (!currentUser) {
        alert('Please sign in before creating a profile.');
        setLoading(false);
        return;
      }

      const door = await generateUniqueId(fullName || currentUser.user_metadata?.full_name || 'user', address || 'unknown');

      const { error } = await supabase.from('profiles').insert([
        { id: currentUser.id, full_name: fullName || null, address: address || null, unique_door_id: door }
      ]);

      if (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile: ' + error.message);
      } else {
        setDoorId(door);
        alert(`ඔබේ දොරටුවේ ID එක: ${door}`);
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const callUrl = `${origin}/call/${doorId}`;
  const hostUrl = `${origin}/host/${doorId}`;

  return (
    <div className="mx-auto max-w-3xl p-6 text-slate-950">
      <h1 className="text-4xl font-semibold">Admin</h1>
      <p className="mt-2 text-slate-600">Generate a door ID and QR code for visitors.</p>

      <div className="mt-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-700">Signed in as <strong>{user.email || user.id}</strong></div>
            <button
              className="rounded-2xl bg-red-600 px-3 py-1 text-white"
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex gap-3 items-center">
            <button
              className="rounded-2xl bg-white border px-4 py-2 text-slate-900 font-medium"
              onClick={async () => {
                if (!supabase || !supabase.auth || typeof supabase.auth.signInWithOAuth !== 'function') {
                  return alert('OAuth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.');
                }
                try {
                  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin } });
                } catch (err) {
                  alert('Google sign-in failed: ' + (err.message || err));
                }
              }}
            >
              🔑 Sign in with Google
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <input
          className="col-span-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm outline-none focus:border-slate-500"
          type="text"
          value={fullName}
          placeholder="Full name (optional)"
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm outline-none focus:border-slate-500"
          type="text"
          value={address}
          placeholder="Address (optional)"
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="mt-4 flex gap-3">
        <button
          className="rounded-2xl bg-slate-950 px-6 py-3 text-white transition hover:bg-slate-800"
          type="button"
          disabled={loading}
          onClick={saveUserProfile}
        >
          {loading ? 'Saving…' : 'Create Profile & QR'}
        </button>
      </div>

      {doorId ? (
        <div className="mt-10 grid gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="grid gap-2">
            <div className="font-medium text-slate-700">Door ID</div>
            <div className="rounded-2xl bg-white p-4 text-slate-950 shadow-sm">{doorId}</div>
          </div>

          <div className="grid gap-2">
            <div className="font-medium text-slate-700">Visitor QR code</div>
            <div className="flex justify-center rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeCanvas value={callUrl} size={220} />
            </div>
            <p className="text-slate-600">Visitors scan this QR code to open the call page.</p>
          </div>

          <div className="grid gap-2">
            <div className="font-medium text-slate-700">Direct URLs</div>
            <div className="rounded-2xl bg-white p-4 text-slate-950 shadow-sm">
              <div className="mb-2 break-words">
                Visitor: <a className="text-slate-800 underline" href={callUrl}>{callUrl}</a>
              </div>
              <div className="break-words">
                Host: <a className="text-slate-800 underline" href={hostUrl}>{hostUrl}</a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-10 text-slate-600">Enter optional name/address and create profile to see the QR code.</p>
      )}
    </div>
  );
}
