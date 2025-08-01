import { useState } from 'react';
import { Link } from 'wouter';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const Header = ({ showBackButton = false, showFullNavigation = true, onBackClick }) => {
  const [open, setOpen] = useState(false);
  const { user, isLoading } = useAuth();
  
  // const publicLinks = [
  //   { to: '/', label: 'Home' },
  //   { to: '/about', label: 'About' },
  //   { to: '/contact', label: 'Contact' },
  // ];
  
  const authLinks = [
    { to: '/game-room', label: 'Game Room' },
    { to: '/deposit', label: 'Deposit' },
    { to: '/withdraw', label: 'Withdraw' },
    { to: '/dashboard', label: 'Dashboard' },
  ];
  
  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-black/70 border-b border-amber-400/20">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {showBackButton ? (
          <button 
            onClick={onBackClick}
            className="text-white hover:text-amber-300 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        ) : (
          <Link to="/">
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-rose-500 bg-clip-text text-transparent">
              786Bet
            </span>
          </Link>
        )}

        <nav className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              {authLinks.map((l) => (
                <Link key={l.to} to={l.to}>
                  <span className="text-white/70 hover:text-amber-300 transition">{l.label}</span>
                </Link>
              ))}
              {user.role === 'admin' && (
                <Link to="/admin">
                  <span className="text-white/70 hover:text-amber-300 transition">Admin</span>
                </Link>
              )}
              <div className="flex items-center gap-3">
                <span className="text-amber-300">Welcome, {user.username}</span>
                <button 
                  onClick={() => {
                    localStorage.removeItem('authToken');
                    window.location.href = '/';
                  }}
                  className="border border-amber-400/50 px-4 py-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              {/* {publicLinks.map((l) => (
                <Link key={l.to} to={l.to}>
                  <span className="text-white/70 hover:text-amber-300 transition">{l.label}</span>
                </Link>
              ))} */}
              <Link to="/login">
                <button className="border border-amber-400/50 px-4 py-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10">
                  Login
                </button>
              </Link>
              <Link to="/register">
                <button className="bg-amber-400 text-black px-4 py-1.5 rounded-lg hover:bg-amber-500">
                  Sign Up
                </button>
              </Link>
            </>
          )}
        </nav>

        <button onClick={() => setOpen(!open)} className="md:hidden">
          {open ? <X size={24} /> : <Menu size={24} className="text-white" />}
        </button>
        {/* Mobile Menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden fixed inset-x-0 top-20 bg-black/90 backdrop-blur-lg border-b border-amber-400/20 p-6 flex flex-col gap-4"
            >
              {user ? (
                <>
                  {authLinks.map((l) => (
                    <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
                      <span className="text-white/70 hover:text-amber-300 transition text-lg">{l.label}</span>
                    </Link>
                  ))}
                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={() => setOpen(false)}>
                      <span className="text-white/70 hover:text-amber-300 transition text-lg">Admin</span>
                    </Link>
                  )}
                  <button 
                    onClick={() => {
                      sessionStorage.removeItem('authToken');
                      window.location.href = '/';
                    }}
                    className="w-full border border-amber-400/50 px-4 py-2 rounded-lg text-amber-400 hover:bg-amber-400/10"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>

                  <Link to="/login" onClick={() => setOpen(false)}>
                    <button className="w-full border border-amber-400/50 px-4 py-2 rounded-lg text-amber-400 hover:bg-amber-400/10">
                      Login
                    </button>
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)}>
                    <button className="w-full bg-amber-400 text-black px-4 py-2 rounded-lg hover:bg-amber-500">
                      Sign Up
                    </button>
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;
