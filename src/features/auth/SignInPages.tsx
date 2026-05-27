import { FormEvent, useEffect, useRef, useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/useAuth';
import { ApiError, authApi } from '../../lib/api-client';
import { AuthShell, IconInput, LoadingNotice, Notice } from './authShared';
import { authPath, type Navigate } from './authUtils';

export function SignInPage({ onNavigate }: { onNavigate: Navigate }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim();
  const passwordSignInPath = normalizedEmail
    ? `${authPath('/password-sign-in')}?email=${encodeURIComponent(normalizedEmail)}`
    : authPath('/password-sign-in');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!normalizedEmail) {
      setError('Введите почту.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.startEmailFlow(normalizedEmail);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'auth.email_required' || err.code === 'auth.email_invalid')) {
        setError(err.message || 'Укажите корректный email.');
        return;
      }
      setError(err instanceof ApiError && err.code === 'auth.invalid_email_app'
        ? 'Ошибка настройки входа.'
        : 'Не удалось отправить письмо. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Введите почту">
      {sent && <Notice kind="success">Отправили письмо для входа.</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <IconInput
          icon={Mail}
          label="Почта"
          type="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            setSent(false);
          }}
          placeholder="you@provider.com"
          autoComplete="email"
          required
        />

        <Button type="submit" variant="primary" size="md" loading={loading} className="w-full justify-center">
          Войти
        </Button>
      </form>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <Button onClick={() => onNavigate(passwordSignInPath)} variant="secondary" className="w-full justify-center">
          Войти с паролем
        </Button>
      </div>
    </AuthShell>
  );
}

export function PasswordSignInPage({ initialEmail = '', onNavigate }: { initialEmail?: string; onNavigate: Navigate }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Заполните все поля.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      onNavigate('/');
    } catch (err) {
      setError(err instanceof ApiError && (err.status === 400 || err.status === 401)
        ? 'Неверная почта или пароль.'
        : 'Ошибка в работе сервиса.');
    } finally {
      setLoading(false);
    }
  };

  const forgotPasswordPath = email.trim()
    ? `${authPath('/forgot-password')}?email=${encodeURIComponent(email.trim())}`
    : authPath('/forgot-password');

  return (
    <AuthShell title="Вход с паролем">
      {error && <Notice kind="error">{error}</Notice>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <IconInput
          icon={Mail}
          label="Почта"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@provider.com"
          autoComplete="email"
        />

        <IconInput
          icon={Lock}
          label="Пароль"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="********"
          autoComplete="current-password"
        />

        <Button type="submit" variant="primary" size="md" loading={loading} className="w-full justify-center">
          Войти
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => onNavigate(forgotPasswordPath)} className="font-medium text-blue-700 hover:text-blue-800">
          Забыли пароль?
        </button>
        <button onClick={() => onNavigate(authPath('/sign-in'))} className="font-medium text-blue-700 hover:text-blue-800">
          Войти по почте
        </button>
      </div>
    </AuthShell>
  );
}

export function MagicSignInPage({ token, onNavigate }: { token: string | null; onNavigate: Navigate }) {
  const { reloadUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const magicTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || magicTokenRef.current === token) return;
    magicTokenRef.current = token;

    const startedAt = Date.now();
    const minLoaderMs = 900;
    let cancelled = false;

    const finish = (nextStatus: 'success' | 'error') => {
      const elapsed = Date.now() - startedAt;
      window.setTimeout(() => {
        if (!cancelled) {
          setStatus(nextStatus);
        }
      }, Math.max(0, minLoaderMs - elapsed));
    };

    const signInWithToken = async () => {
      try {
        await authApi.magicSignIn(token);
        const session = await reloadUser();
        if (!session) {
          finish('error');
          return;
        }
        finish('success');
        window.setTimeout(() => {
          if (!cancelled) {
            onNavigate('/');
          }
        }, Math.max(700, minLoaderMs - (Date.now() - startedAt)));
      } catch {
        finish('error');
      }
    };

    void signInWithToken();

    return () => {
      cancelled = true;
    };
  }, [onNavigate, reloadUser, token]);

  return (
    <AuthShell title="Вход по ссылке">
      {status === 'loading' && <LoadingNotice>Входим в кабинет...</LoadingNotice>}
      {status === 'success' && <Notice kind="success">Готово. Открываем кабинет.</Notice>}
      {status === 'error' && <Notice kind="error">Ссылка недействительна или истекла.</Notice>}

      {status === 'error' && (
        <Button onClick={() => onNavigate('/auth/sign-in')} variant="primary" className="w-full justify-center">
          Войти
        </Button>
      )}
    </AuthShell>
  );
}
