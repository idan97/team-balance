import { useEffect, useState } from 'react';
import { client } from '@/api/client';

export function useAuthGuard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const isAuth = await client.auth.isAuthenticated();
      if (!isAuth) {
        await client.auth.redirectToLogin();
        return;
      }
      setUser(await client.auth.me());
    })();
  }, []);

  return user;
}
