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

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  async function saveUserProfile() {
    try {
      setLoading(true);

      const authRes = await supabase.auth.getUser();
      const user = authRes?.data?.user;
      if (!user) {
        alert('Please sign in before creating a profile.');
        setLoading(false);
        return;
      }

      const door = await generateUniqueId(fullName || user.user_metadata?.full_name || 'user', address || 'unknown');

      const { error } = await supabase.from('profiles').insert([
        { id: user.id, full_name: fullName || null, address: address || null, unique_door_id: door }
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
