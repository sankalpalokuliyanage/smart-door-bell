'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabaseClient';

function sanitizeForId(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function generateUniqueDoorSlug(name) {
  const baseSlug = sanitizeForId(name) || `door_${Math.random().toString(36).slice(2, 6)}`;
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from('doors')
      .select('id')
      .eq('door_id_slug', slug)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return slug;
    }

    slug = `${baseSlug}_${counter}`;
    counter += 1;
  }
}

export default function AdminPage() {
  const [origin, setOrigin] = useState('');
  const [user, setUser] = useState(null);
  const [doors, setDoors] = useState([]);
  const [selectedDoor, setSelectedDoor] = useState(null);
  const [doorName, setDoorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    const loadUser = async () => {
      try {
        if (supabase?.auth?.getUser) {
          const response = await supabase.auth.getUser();
          const currentUser = response?.data?.user ?? null;
          setUser(currentUser);

          if (currentUser) {
            fetchDoors(currentUser.id);
          }
        }
      } catch (error) {
        console.warn('Unable to load user', error);
      }
    };

    loadUser();

    const authListener = supabase?.auth?.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchDoors(currentUser.id);
      } else {
        setDoors([]);
        setSelectedDoor(null);
      }
    });

    return () => {
      if (authListener?.data?.subscription?.unsubscribe) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, []);

  const fetchDoors = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('doors')
        .select('id, door_name, door_id_slug, qr_code_image_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setDoors(data || []);
      if (data?.length > 0) {
        setSelectedDoor((prev) => prev || data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch doors:', error);
      setErrorMessage('Unable to load your doors. Please refresh and try again.');
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');
    setStatusMessage('');

    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });

      if (result?.error) {
        setErrorMessage(result.error.message || 'Google sign-in failed.');
      }
    } catch (error) {
      setErrorMessage(error?.message || 'Google sign-in failed.');
    }
  };

  const handleCreateDoor = async () => {
    if (!user) {
      setErrorMessage('Please sign in with Google before creating a door.');
      return;
    }

    const trimmedDoorName = doorName.trim();
    if (!trimmedDoorName) {
      setErrorMessage('Please enter a door name before creating a new door.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const slug = await generateUniqueDoorSlug(trimmedDoorName);
      const callUrl = `${origin}/call/${slug}`;
      const qrDataUrl = await QRCode.toDataURL(callUrl, {
        type: 'image/png',
        width: 400,
        margin: 1,
      });

      const qrBlob = await (await fetch(qrDataUrl)).blob();
      const storagePath = `${user.id}/${slug}.png`;
      const { error: uploadError } = await supabase.storage
        .from('qrcodes')
        .upload(storagePath, qrBlob, { contentType: 'image/png', upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData, error: publicUrlError } = await supabase.storage
        .from('qrcodes')
        .getPublicUrl(storagePath);

      if (publicUrlError) {
        throw publicUrlError;
      }

      const qrCodeImageUrl = publicData?.publicUrl || '';

      const { error: insertError, data: inserted } = await supabase.from('doors').insert(
        [
          {
            user_id: user.id,
            door_name: trimmedDoorName,
            door_id_slug: slug,
            qr_code_image_url: qrCodeImageUrl,
          },
        ],
        { returning: 'representation' }
      );

      if (insertError) {
        throw insertError;
      }

      await fetchDoors(user.id);
      setSelectedDoor(inserted?.[0] ?? null);
      setDoorName('');
      setStatusMessage('Door created successfully. QR code image was saved to Supabase Storage.');
    } catch (error) {
      console.error('Failed to create door:', error);
      setErrorMessage(error?.message || 'Unable to create the door.');
    } finally {
      setLoading(false);
    }
  };

  const callUrl = selectedDoor ? `${origin}/call/${selectedDoor.door_id_slug}` : '';
  const hostUrl = selectedDoor ? `${origin}/host/${selectedDoor.door_id_slug}` : '';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_32%),#020617] text-slate-100">
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
              <div className="mt-4">
                <input
                  className="w-full rounded-[20px] border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
                  value={doorName}
                  placeholder="Door name (e.g. Main Gate, Office Entrance)"
                  onChange={(e) => setDoorName(e.target.value)}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  disabled={loading || !user}
                  onClick={handleCreateDoor}
                >
                  {loading ? 'Creating...' : 'Create door and QR'}
                </button>
                <button
                  className="rounded-full border border-slate-700 bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300 disabled={!user || doors.length === 0}"
                  type="button"
                  disabled={!user || doors.length === 0}
                  onClick={() => setSelectedDoor(doors[0] || null)}
                >
                  Select latest door
                </button>
              </div>

              <p className="mt-4 text-sm text-slate-400">Your door entries are saved in Supabase Storage and can be selected from the door collection.</p>
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

            {selectedDoor ? (
              <div className="space-y-6 rounded-[28px] border border-cyan-500/15 bg-slate-950/90 p-6 shadow-sm shadow-cyan-500/5">
                <div className="rounded-[24px] bg-slate-900/95 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Door name</p>
                      <p className="mt-2 text-lg font-semibold text-white">{selectedDoor.door_name}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300">Active</span>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-slate-800/60 bg-slate-950/80 p-4 text-slate-300">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Visitor URL</p>
                    <p className="mt-2 break-all text-sm text-white">{callUrl}</p>
                  </div>
                </div>

                <div className="rounded-[28px] bg-slate-900/95 p-6 text-center shadow-[0_20px_50px_-30px_rgba(14,165,233,0.35)]">
                  <div className="inline-flex rounded-[32px] bg-slate-950 p-5">
                    <img
                      className="h-[220px] w-[220px] rounded-[28px] object-contain"
                      src={selectedDoor.qr_code_image_url}
                      alt={`QR for ${selectedDoor.door_name}`}
                    />
                  </div>
                  <p className="mt-4 text-sm text-slate-400">This QR is saved in Supabase Storage and linked to your door record.</p>
                </div>

                <div className="grid gap-3 rounded-[24px] border border-slate-800/60 bg-slate-950/80 p-5 text-sm text-slate-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">Host page</span>
                    <a className="text-cyan-300 underline break-all" href={hostUrl}>{hostUrl}</a>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">Visitor page</span>
                    <a className="text-cyan-300 underline break-all" href={callUrl}>{callUrl}</a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-950/80 p-6 text-slate-400">
                <p className="text-sm">Select a door from the list to see its QR card and URLs.</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      <footer className="mt-10 text-center text-sm text-slate-500">Developed by Sankalpa Lokuliyanage</footer>
    </main>
  );
}
