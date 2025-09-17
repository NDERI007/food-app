import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold text-green-900 mb-4">404</h1>
      <p className="text-xl text-gray-700 mb-6">
        Oops! The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="bg-green-900 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-green-800 transition"
      >
        Go Home
      </Link>
    </div>
  );
}
