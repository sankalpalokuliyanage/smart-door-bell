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
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
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
      setStatusMessage('');

      const authRes = await supabase.auth.getUser();
      const currentUser = authRes?.data?.user ?? user;
      if (!currentUser) {
        setStatusMessage('Please sign in before creating a profile.');
        setLoading(false);
        return;
      }

      const door = await generateUniqueId(fullName || currentUser.user_metadata?.full_name || 'user', address || 'unknown');
      const { error } = await supabase.from('profiles').upsert(
        [
          {
            id: currentUser.id,
            full_name: fullName || currentUser.user_metadata?.full_name || null,
            address: address || null,
            unique_door_id: door,
          },
        ],
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Error saving profile:', error);
        setStatusMessage('Failed to save profile: ' + error.message);
      } else {
        setDoorId(door);
        setStatusMessage('QR code generated successfully. Use Add another one to create a new door link.');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Unexpected error: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function addAnotherDoor() {
    try {
      setLoading(true);
      setStatusMessage('');

      const authRes = await supabase.auth.getUser();
      const currentUser = authRes?.data?.user ?? user;
      if (!currentUser) {
        setStatusMessage('Please sign in before creating a new QR.');
        setLoading(false);
        return;
      }

      const door = await generateUniqueId(fullName || currentUser.user_metadata?.full_name || 'user', address || 'unknown');
      const { error } = await supabase.from('profiles').upsert(
        [
          {
            id: currentUser.id,
            full_name: fullName || currentUser.user_metadata?.full_name || null,
            address: address || null,
            unique_door_id: door,
          },
        ],
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Error updating profile:', error);
        setStatusMessage('Failed to create another QR: ' + error.message);
      } else {
        setDoorId(door);
        setStatusMessage('New QR generated. Your previous door link has been replaced in this profile.');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Unexpected error: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const callUrl = `${origin}/call/${doorId}`;
  const hostUrl = `${origin}/host/${doorId}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-800/70 bg-slate-950/95 p-8 shadow-2xl shadow-cyan-500/10">
        <header className="mb-10 grid gap-6 rounded-[28px] border border-cyan-500/10 bg-slate-900/90 p-8 shadow-inner shadow-cyan-500/5 sm:grid-cols-[1.8fr_1fr] sm:items-end">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/90">Smart Doorbell Admin</p>
            <h1 className="text-4xl font-semibold text-white sm:text-5xl">My Page</h1>
            <p className="max-w-2xl text-slate-400 sm:text-lg">
              Manage your host profile, generate a beautiful QR code for visitors, and keep your active door link handy.
            </p>
          </div>

          <div className="grid gap-4">
            {user ? (
              <div className="rounded-[24px] border border-cyan-500/15 bg-slate-950/90 p-5 text-slate-200">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Signed in as</p>
                <p className="mt-2 text-lg font-semibold text-white break-all">{user.email || user.id}</p>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-950/90 p-5 text-slate-400">
                <p className="mb-3 text-lg font-semibold text-white">Ready to start?</p>
                <p>Sign in with Google to create your host page and QR codes.</p>
              </div>
            )}
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-8 rounded-[28px] border border-slate-800/80 bg-slate-900/95 p-8 shadow-xl shadow-slate-950/10">
            <div className="rounded-[28px] border border-cyan-500/10 bg-slate-950/90 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Host details</p>
                  <h2 className="text-3xl font-semibold text-white">Your host profile</h2>
                </div>
                <span className="inline-flex rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                  Mypage</span>
              </div>
              <p className="mt-4 text-slate-400">Create a secure door ID, share the QR with visitors, and keep your active door link in the My QRs section.</p>
            </div>

            <div className="grid gap-4 rounded-[24px] bg-slate-950/90 p-6 sm:grid-cols-2">
              <div className="rounded-[24px] bg-slate-900/95 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Name</p>
                <p className="mt-2 text-xl font-semibold text-white">{user ? user.user_metadata?.full_name || user.email : '---'}</p>
              </div>
              <div className="rounded-[24px] bg-slate-900/95 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Email</p>
                <p className="mt-2 text-xl font-semibold text-white">{user ? user.email : '---'}</p>
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-950/90 p-6 shadow-sm shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Create your door</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <input
                  className="rounded-[20px] border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                  value={fullName}
                  placeholder="Full name (optional)"
                  onChange={(e) => setFullName(e.target.value)}
                />
                <input
                  className="rounded-[20px] border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                  value={address}
                  placeholder="Address (optional)"
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  disabled={loading}
                  onClick={saveUserProfile}
                >
                  {loading ? 'Saving…' : doorId ? 'Generate QR again' : 'Generate QR'}
                </button>
                <button
                  className="rounded-full border border-slate-700 bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  disabled={loading || !doorId}
                  onClick={addAnotherDoor}
                >
                  Add another one
                </button>
              </div>

              <p className="mt-4 text-sm text-slate-400">After creating a QR, the active link is shown in My QRs. If you want a new link, choose Add another one.</p>
            </div>

            {statusMessage ? (
              <div className="rounded-[24px] border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-100">
                {statusMessage}
              </div>
            ) : null}
          </section>

          <aside className="space-y-6 rounded-[28px] border border-slate-800/80 bg-slate-900/95 p-8 shadow-xl shadow-slate-950/10">
            <div className="rounded-[24px] bg-slate-950/90 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">My QRs</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Your door links</h2>
              <p className="mt-3 text-slate-400">Keep the current door and a polished QR card for visitors.</p>
            </div>

            {doorId ? (
              <div className="space-y-6 rounded-[28px] border border-cyan-500/10 bg-slate-950/90 p-6 shadow-sm shadow-cyan-500/5">
                <div className="grid gap-4 rounded-[24px] bg-slate-900/95 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active Door</p>
                      <p className="mt-2 text-lg font-semibold text-white break-all">{doorId}</p>
                    </div>
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">Current</span>
                  </div>
                  <div className="rounded-[24px] border border-cyan-500/15 bg-slate-950 p-4 text-slate-300">
                    <div className="mb-2 text-xs uppercase tracking-[0.3em] text-slate-500">Visitor URL</div>
                    <div className="break-all text-sm text-white">{callUrl}</div>
                  </div>
                </div>

                <div className="rounded-[28px] bg-slate-900/95 p-6 text-center shadow-[0_20px_50px_-30px_rgba(14,165,233,0.35)]">
                  <div className="inline-flex rounded-[32px] bg-slate-950 p-5">
                    <QRCodeCanvas value={callUrl} size={220} bgColor="#020617" fgColor="#38bdf8" level="H" />
                  </div>
                  <p className="mt-4 text-sm text-slate-400">Scan this QR to call your host page.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-950/80 p-6 text-slate-400">
                <p className="text-sm">Your QR cards will appear here after you generate a door link.</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      <footer className="mt-10 text-center text-sm text-slate-500">Developed by Sankalpa Lokuliyanage</footer>
    </main>
  );
}
