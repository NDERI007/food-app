export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 bg-[#faf7ef] w-full z-30 border-b border-green-700">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-2 py-4">
        {/* App name / logo */}
        <a href="/" className="text-2xl font-bold text-green-900">
          Foodie
        </a>

        {/* Login button */}
        <a
          href="/login"
          className="rounded-lg font-medium text-xl text-green-900 hover:bg-amber-100 transition"
        >
          Login
        </a>
      </div>
    </nav>
  );
}
