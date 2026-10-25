import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSignOut() {
    signOut();
    navigate('/');
    setMenuOpen(false);
  }

  const navLinkClass = ({ isActive }) =>
    `transition-colors hover:text-madder ${isActive ? 'text-madder font-semibold' : 'text-ink/70'}`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-white/95 backdrop-blur-sm shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        {/* Logo */}
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-ink shrink-0">
          Kala<span className="text-madder">Connect</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 text-sm sm:flex">
          <NavLink to="/products" className={navLinkClass}>Browse crafts</NavLink>

          {!isAuthenticated && (
            <>
              <NavLink to="/artisan/login" className={navLinkClass}>Artisan sign in</NavLink>
              <NavLink to="/customer/login" className={navLinkClass}>Customer sign in</NavLink>
            </>
          )}

          {isAuthenticated && role === 'artisan' && (
            <>
              <NavLink to="/artisan/upload" className={navLinkClass}>Add product</NavLink>
              <NavLink to="/artisan/dashboard" className={navLinkClass}>Dashboard</NavLink>
            </>
          )}

          {isAuthenticated && role === 'customer' && (
            <>
              <NavLink to="/customer/cart" className={navLinkClass}>
                🛒 Cart
              </NavLink>
              <NavLink to="/customer/orders" className={navLinkClass}>Orders</NavLink>
            </>
          )}

          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <span className="text-stone text-xs">{user?.name}</span>
              <button
                type="button"
                id="navbar-signout"
                onClick={handleSignOut}
                className="btn-quiet py-1.5 px-3 text-xs"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden p-2 text-ink"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-ink/10 bg-white px-6 py-4 flex flex-col gap-4 text-sm sm:hidden">
          <Link to="/products" onClick={() => setMenuOpen(false)} className="hover:text-madder">Browse crafts</Link>
          {!isAuthenticated && <>
            <Link to="/artisan/login" onClick={() => setMenuOpen(false)} className="hover:text-madder">Artisan sign in</Link>
            <Link to="/customer/login" onClick={() => setMenuOpen(false)} className="hover:text-madder">Customer sign in</Link>
          </>}
          {isAuthenticated && role === 'artisan' && <>
            <Link to="/artisan/upload" onClick={() => setMenuOpen(false)} className="hover:text-madder">Add product</Link>
            <Link to="/artisan/dashboard" onClick={() => setMenuOpen(false)} className="hover:text-madder">Dashboard</Link>
          </>}
          {isAuthenticated && role === 'customer' && <>
            <Link to="/customer/cart" onClick={() => setMenuOpen(false)} className="hover:text-madder">Cart</Link>
            <Link to="/customer/orders" onClick={() => setMenuOpen(false)} className="hover:text-madder">Orders</Link>
          </>}
          {isAuthenticated && (
            <button type="button" onClick={handleSignOut} className="text-left hover:text-madder">Sign out ({user?.name})</button>
          )}
        </div>
      )}
    </header>
  );
}
