import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/useAuth';
import { authApi } from '../../lib/api-client';
import { AuthShell, Notice } from './authShared';
import type { Navigate } from './authUtils';
import { useBackToSignIn } from './useBackToSignIn';

export function ForgotPasswordPage({ initialEmail = '', onNavigate }: { initialEmail?: string; onNavigate: Navigate }) {
  const { returning, backToSignIn } = useBackToSignIn(onNavigate);
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Восстановление пароля">
      {sent && <Notice kind="success">Отправили письмо для восстановления.</Notice>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Почта" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        <Button type="submit" variant="primary" loading={loading} className="w-full justify-center">
          Отправить письмо
        </Button>
      </form>
      {import.meta.env.DEV && (
        <a href={authApi.devEmails()} className="mt-3 block rounded-md border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-50">
          Открыть dev-почту
        </a>
      )}
      <button onClick={backToSignIn} disabled={returning} className="mt-4 w-full text-center text-xs font-medium text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400">
        Вернуться ко входу
      </button>
    </AuthShell>
  );
}

export function ResetPasswordPage({ token, onNavigate }: { token: string | null; onNavigate: Navigate }) {
  const { signOut } = useAuth();
  const { returning, backToSignIn } = useBackToSignIn(onNavigate);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>(token ? 'idle' : 'error');
  const [loading, setLoading] = useState(false);
  const error = useMemo(() => password && confirm && password !== confirm ? 'Пароли не совпадают.' : '', [password, confirm]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || error || !password) return;
    setLoading(true);
    try {
      await signOut();
      await authApi.resetPassword(token, password);
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Новый пароль">
      {status === 'success' && <Notice kind="success">Пароль изменен. Теперь можно войти.</Notice>}
      {status === 'error' && <Notice kind="error">Ссылка недействительна или истекла.</Notice>}

      {status !== 'success' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Новый пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
          <Input label="Повторите пароль" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" error={error} required />
          <Button type="submit" variant="primary" loading={loading} disabled={!token || Boolean(error)} className="w-full justify-center">
            Сменить пароль
          </Button>
        </form>
      )}

      <button onClick={backToSignIn} disabled={returning} className="mt-4 w-full text-center text-xs font-medium text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400">
        Вернуться ко входу
      </button>
    </AuthShell>
  );
}
