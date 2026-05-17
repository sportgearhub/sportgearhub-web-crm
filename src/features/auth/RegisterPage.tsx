import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/useAuth';
import { ApiError, authApi } from '../../lib/api-client';
import { AuthShell, LoadingNotice, Notice } from './authShared';
import type { Navigate } from './authUtils';
import { useBackToSignIn } from './useBackToSignIn';

type RegisterForm = {
  name: string;
  surname: string;
  email: string;
  password: string;
};

export function RegisterPage({ token, onNavigate }: { token?: string | null; onNavigate: Navigate }) {
  const { reloadUser } = useAuth();
  const { returning, backToSignIn } = useBackToSignIn(onNavigate);
  const [form, setForm] = useState<RegisterForm>({ name: '', surname: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(token ? 'loading' : 'idle');
  const isInvitationRegistration = Boolean(token);

  useEffect(() => {
    if (!token) {
      setInvitationStatus('idle');
      return;
    }

    let cancelled = false;
    setInvitationStatus('loading');
    setError('');

    authApi.registrationInvitation(token)
      .then(invitation => {
        if (cancelled) return;
        setForm(current => ({ ...current, email: invitation.email, password: '' }));
        setInvitationStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setInvitationStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const updateForm = (patch: Partial<RegisterForm>) => {
    setForm(current => ({ ...current, ...patch }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const password = form.password.trim();
    if (!form.name || !form.surname || (!isInvitationRegistration && (!form.email || !form.password))) {
      setFieldErrors({});
      setError('Заполните все поля.');
      return;
    }
    if (!isInvitationRegistration && password.length < 8) {
      setFieldErrors({ password: 'Пароль должен содержать не менее 8 символов.' });
      setError('');
      return;
    }

    setFieldErrors({});
    setError('');
    setLoading(true);
    try {
      await authApi.register(isInvitationRegistration
        ? { token: token ?? undefined, name: form.name, surname: form.surname }
        : form);

      if (isInvitationRegistration) {
        const session = await reloadUser();
        onNavigate(session ? '/' : '/auth/sign-in');
        return;
      }

      onNavigate(`/auth/check-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'auth.password_too_short') {
        setFieldErrors({ password: err.message });
        return;
      }
      if (err instanceof ApiError && (err.code === 'auth.email_required' || err.code === 'auth.email_already_exists')) {
        setFieldErrors({ email: err.message });
        return;
      }
      if (err instanceof ApiError && (err.code === 'auth.token_invalid' || err.code === 'auth.token_invalid_or_expired')) {
        setInvitationStatus('error');
        return;
      }
      setError(err instanceof ApiError
        ? err.message
        : 'Не удалось зарегистрироваться. Проверьте данные и попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  if (invitationStatus === 'loading') {
    return (
      <AuthShell title="Регистрация владельца">
        <LoadingNotice>Проверяем ссылку...</LoadingNotice>
      </AuthShell>
    );
  }

  if (invitationStatus === 'error') {
    return (
      <AuthShell title="Регистрация владельца">
        <Notice kind="error">Ссылка недействительна или истекла.</Notice>
        <Button onClick={() => onNavigate('/auth/sign-in')} variant="primary" className="w-full justify-center">
          Войти
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Регистрация владельца">
      {error && <Notice kind="error">{error}</Notice>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Имя" value={form.name} onChange={e => updateForm({ name: e.target.value })} autoComplete="given-name" />
          <Input label="Фамилия" value={form.surname} onChange={e => updateForm({ surname: e.target.value })} autoComplete="family-name" />
        </div>
        <Input label="Почта" type="email" value={form.email} onChange={e => updateForm({ email: e.target.value })} autoComplete="email" error={fieldErrors.email} disabled={isInvitationRegistration} />
        {!isInvitationRegistration && (
          <Input label="Пароль" type="password" value={form.password} onChange={e => updateForm({ password: e.target.value })} autoComplete="new-password" hint="Минимум 8 символов." error={fieldErrors.password} />
        )}
        <Button type="submit" variant="primary" loading={loading} className="w-full justify-center">
          Создать аккаунт
        </Button>
      </form>

      <button onClick={backToSignIn} disabled={returning} className="mt-4 w-full text-center text-xs font-medium text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400">
        Вернуться ко входу
      </button>
    </AuthShell>
  );
}
