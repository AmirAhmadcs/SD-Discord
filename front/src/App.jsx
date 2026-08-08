import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider, useStore } from "./context/StoreContext";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import AppShell from "./pages/AppShell";

function RequireGuest({ children }) {
  const { currentUser, db } = useStore();

  if (!db.initialized) {
    return null;
  }

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireAuth({ children }) {
  const { currentUser, db } = useStore();

  if (!db.initialized) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/register"
            element={
              <RequireGuest>
                <RegisterPage />
              </RequireGuest>
            }
          />
          <Route
            path="/login"
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
