import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md safe-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 transition-colors hover:text-primary-600"
        >
          <span className="text-primary-600">Formify</span>
        </Link>

        {/* Desktop: user info + logout */}
        <div className="hidden items-center gap-4 sm:flex">
          <div className="text-sm">
            <span className="font-medium text-slate-900">{user?.name}</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-slate-600">{user?.role}</span>
          </div>
          <button
            className="btn-secondary min-h-0 min-w-0 py-2"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        {/* Mobile: menu button */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:hidden">
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Logged in as</div>
              <div className="mt-1 font-semibold text-slate-900">{user?.name}</div>
              <div className="text-sm text-slate-600">{user?.role}</div>
            </div>
            <button
              className="btn-primary w-full"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
