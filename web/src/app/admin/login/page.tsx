'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { api, setToken, ApiError } from '@/lib/api';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ accessToken: string }>(
        '/auth/admin/login',
        { email, password },
        { auth: false },
      );
      setToken(res.accessToken);
      router.push('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/12">
            <Lock className="text-accent" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">KantTools Admin</h1>
          <p className="text-sm text-muted">Sign in to the control panel</p>
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@kanttools.local"
          className="mb-3 w-full rounded-xl bg-bg-elevated px-4 py-3 text-white outline-none ring-accent/40 focus:ring-2"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl bg-bg-elevated px-4 py-3 text-white outline-none ring-accent/40 focus:ring-2"
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="btn-primary mt-5 w-full">
          {busy ? <Loader2 className="animate-spin" size={18} /> : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
