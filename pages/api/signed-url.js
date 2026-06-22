import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Missing `path` query parameter' });
  }

  try {
    const { data, error } = await supabaseAdmin.storage.from('qrcodes').createSignedUrl(path, 60);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
