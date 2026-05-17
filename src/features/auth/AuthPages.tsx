import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, Mail, Mountain } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/useAuth';
import { ApiError, authApi } from '../../lib/api-client';

type Navigate = (path: string, replace?: boolean) => void;
type AuthInputIcon = typeof Mail;

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <Mountain size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sportgearhub</h1>
          <p className="mt-1 text-sm text-gray-500">Кабинет партнера</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function IconInput({ icon: Icon, className = '', ...props }: React.ComponentProps<typeof Input> & { icon: AuthInputIcon }) {
  return (
    <div className="relative">
      <Input {...props} className={`pl-9 ${className}`} />
      <Icon size={14} className="pointer-events-none absolute left-3 bottom-[13px] text-gray-400" />
    </div>
  );
}

function Notice({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  const isError = kind === 'error';

  return (
    <div className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 ${isError ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
      {isError ? (
        <AlertCircle size={14} className="shrink-0 text-red-600" />
      ) : (
        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
      )}
      <p className={`text-xs ${isError ? 'text-red-700' : 'text-emerald-700'}`}>{children}</p>
    </div>
  );
}

function authPath(path: string) {
  return path.startsWith('/auth') ? path : `/auth${path}`;
}

function useBackToSignIn(onNavigate: Navigate) {
  const { signOut, user } = useAuth();
  const [returning, setReturning] = useState(false);
  const backToSignIn = useCallback(async () => {
    setReturning(true);
    try {
      if (user) {
        await signOut();
      }
      onNavigate('/auth/sign-in', true);
    } catch {
      setReturning(false);
    }
  }, [onNavigate, signOut, user]);

  return {
    returning,
    backToSignIn,
  };
}

export function SignInPage({ onNavigate }: { onNavigate: Navigate }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <AuthShell title="Вход в аккаунт">
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
        <button onClick={() => onNavigate(authPath('/register'))} className="font-medium text-blue-700 hover:text-blue-800">
          Создать аккаунт
        </button>
      </div>
    </AuthShell>
  );
}

export function RegisterPage({ onNavigate }: { onNavigate: Navigate }) {
  const { returning, backToSignIn } = useBackToSignIn(onNavigate);
  const [form, setForm] = useState({ name: '', surname: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const password = form.password.trim();
    if (!form.name || !form.surname || !form.email || !form.password) {
      setFieldErrors({});
      setError('Заполните все поля.');
      return;
    }
    if (password.length < 8) {
      setFieldErrors({ password: 'Пароль должен содержать не менее 8 символов.' });
      setError('');
      return;
    }
    setFieldErrors({});
    setError('');
    setLoading(true);
    try {
      await authApi.register(form);
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
      setError(err instanceof ApiError
        ? err.message
        : 'Не удалось зарегистрироваться. Проверьте данные и попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Регистрация владельца">
      {error && <Notice kind="error">{error}</Notice>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Имя" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="given-name" />
          <Input label="Фамилия" value={form.surname} onChange={e => setForm({ ...form, surname: e.target.value })} autoComplete="family-name" />
        </div>
        <Input label="Почта" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email" error={fieldErrors.email} />
        <Input label="Пароль" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" hint="Минимум 8 символов." error={fieldErrors.password} />
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

export function CheckEmailPage({ email, onNavigate }: { email: string; onNavigate: Navigate }) {
  const { returning, backToSignIn } = useBackToSignIn(onNavigate);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await authApi.resendVerification(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Проверьте почту">
      <Notice kind="success">
        Мы отправили ссылку для подтверждения{email ? ` на ${email}` : ''}. Подтвердите почту перед входом.
      </Notice>
      {sent && <Notice kind="success">Если аккаунт с такой почтой существует, новое письмо отправлено.</Notice>}

      <div className="space-y-3">
        <Button onClick={resend} loading={loading} className="w-full justify-center">
          Отправить еще раз
        </Button>
        {import.meta.env.DEV && (
          <a href={authApi.devEmails()} className="block rounded-md border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-50">
            Открыть dev-почту
          </a>
        )}
        <Button onClick={backToSignIn} loading={returning} variant="ghost" className="w-full justify-center">
          Вернуться ко входу
        </Button>
      </div>
    </AuthShell>
  );
}

export function VerifyEmailPage({ token, onNavigate }: { token: string | null; onNavigate: Navigate }) {
  const { signOut } = useAuth();
  const { returning, backToSignIn } = useBackToSignIn(onNavigate);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [secondsLeft, setSecondsLeft] = useState(5);
  const verificationTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || verificationTokenRef.current === token) return;
    verificationTokenRef.current = token;

    const startedAt = Date.now();
    const minLoaderMs = 900;
    let cancelled = false;
    let finishTimeoutId: number | undefined;

    const finish = (nextStatus: 'success' | 'error') => {
      const elapsed = Date.now() - startedAt;
      finishTimeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setStatus(nextStatus);
        }
      }, Math.max(0, minLoaderMs - elapsed));
    };

    const verifyToken = async () => {
      try {
        await signOut();
        await authApi.verifyEmail(token);
        finish('success');
      } catch {
        finish('error');
      }
    };

    void verifyToken();

    return () => {
      cancelled = true;
      if (finishTimeoutId) {
        window.clearTimeout(finishTimeoutId);
      }
    };
  }, [signOut, token]);

  useEffect(() => {
    if (status !== 'success') return;

    setSecondsLeft(5);
    const redirectId = window.setTimeout(() => void backToSignIn(), 5000);
    const intervalId = window.setInterval(() => {
      setSecondsLeft(current => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(redirectId);
      window.clearInterval(intervalId);
    };
  }, [backToSignIn, status]);

  return (
    <AuthShell title="Подтверждение почты">
      {status === 'loading' && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
          <p className="text-xs font-medium text-blue-800">Подтверждаем почту...</p>
        </div>
      )}
      {status === 'success' && (
        <Notice kind="success">
          Почта подтверждена. Перенаправим ко входу через {secondsLeft} сек.
        </Notice>
      )}
      {status === 'error' && <Notice kind="error">Ссылка недействительна или устарела.</Notice>}

      <div className="space-y-3">
        {status === 'error' && (
          <Button onClick={() => onNavigate('/auth/check-email')} className="w-full justify-center">
            Отправить ссылку еще раз
          </Button>
        )}
        <Button onClick={backToSignIn} loading={returning} variant="primary" className="w-full justify-center">
          Войти
        </Button>
      </div>
    </AuthShell>
  );
}

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
      {sent && <Notice kind="success">Если аккаунт с такой почтой существует, ссылка для сброса отправлена.</Notice>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Почта" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        <Button type="submit" variant="primary" loading={loading} className="w-full justify-center">
          Отправить ссылку
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
      {status === 'error' && <Notice kind="error">Ссылка для сброса недействительна или устарела.</Notice>}

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
