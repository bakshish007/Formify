import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await login({ rollNumber, password });
      toast.success("Logged in");
      if (user.role === "Student") navigate("/student", { replace: true });
      else if (user.role === "Teacher") navigate("/teacher", { replace: true });
      else navigate("/admin", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50/30">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-200/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-slate-200/30 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-10 safe-top safe-bottom">
        <div className="w-full">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900">
              <span className="text-primary-600">Formify</span>
            </div>
          </div>

          <div className="card-elevated">
            <div className="mb-6 text-center">
              <h1 className="page-title text-2xl">Welcome back</h1>
              <p className="mt-2 text-sm text-slate-600">Sign in with your credentials to continue.</p>
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Username</label>
                <input
                  className="input-field mt-2"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 21CS001"
                  autoComplete="username"
                  type="text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  className="input-field mt-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
