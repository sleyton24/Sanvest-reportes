// Contexto de autenticación. Guarda el token (localStorage) y el usuario actual.
// Al montar, si hay token, rehidrata el perfil con GET /auth/me; ante un 401 en
// cualquier llamada, el handler global limpia la sesión y vuelve al login.
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  AppUser, fetchMe, login as apiLogin,
  setToken, clearToken, getToken, setUnauthorizedHandler,
} from "./api";

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = (): AuthCtx => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => { clearToken(); setUser(null); });
    (async () => {
      if (getToken()) {
        try {
          setUser(await fetchMe());
        } catch {
          clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const { token, user } = await apiLogin(username, password);
    setToken(token);
    setUser(user);
  };

  const logout = () => { clearToken(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
