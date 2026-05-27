import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/useAuth';
import { authApi } from '../../lib/api-client';
import { AuthShell, LoadingNotice, Notice } from './authShared';
import type { Navigate } from './authUtils';
import { useBackToSignIn } from './useBackToSignIn';

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
        Отправили письмо для подтверждения{email ? ` на ${email}` : ''}.
      </Notice>
      {sent && <Notice kind="success">Отправили письмо еще раз.</Notice>}

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
      {status === 'loading' && <LoadingNotice>Подтверждаем почту...</LoadingNotice>}
      {status === 'success' && (
        <Notice kind="success">
          Почта подтверждена. Перенаправим ко входу через {secondsLeft} сек.
        </Notice>
      )}
      {status === 'error' && <Notice kind="error">Ссылка недействительна или истекла.</Notice>}

      <div className="space-y-3">
        {status === 'error' && (
          <Button onClick={() => onNavigate('/auth/check-email')} className="w-full justify-center">
            Отправить еще раз
          </Button>
        )}
        <Button onClick={backToSignIn} loading={returning} variant="primary" className="w-full justify-center">
          Войти
        </Button>
      </div>
    </AuthShell>
  );
}
