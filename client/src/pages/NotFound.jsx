import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12 safe-top safe-bottom">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-4xl font-bold text-slate-400">
            404
          </div>
        </div>
        <h1 className="page-title text-2xl">Page not found</h1>
        <p className="mt-3 text-slate-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="btn-primary mt-8 inline-flex"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
