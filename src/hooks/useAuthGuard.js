import { useEffect, useState } from 'react';
import { client } from '@/api/client';

export function useAuthGuard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const isAuth = await client.auth.isAuthenticated();
      if (!isAuth) {
        await client.auth.redirectToLogin();
        return;
      }
      setUser(await client.auth.me());
      setLoading(false);
    })();
  }, []);

  return { user, loading };
}
