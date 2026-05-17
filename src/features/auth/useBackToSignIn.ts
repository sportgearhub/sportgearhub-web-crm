import { useCallback, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import type { Navigate } from './authUtils';

export function useBackToSignIn(onNavigate: Navigate) {
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
