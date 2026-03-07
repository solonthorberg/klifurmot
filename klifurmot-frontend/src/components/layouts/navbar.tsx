import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

export default function Navbar() {
    const { isAuthenticated, clearTokens, userAccount } = useAuthStore();
    const [menuOpen, setMenuOpen] = useState(false);

    const navigationItems = [
        { label: 'Mót', path: '/competitions' },
        { label: 'Keppendur', path: '/athletes' },
        { label: 'Um Okkur', path: '/about' },
        ...(userAccount?.is_admin
            ? [{ label: 'Stjórnborð', path: '/controlpanel' }]
            : []),
    ];

    return (
        <nav className="relative z-50 h-16 bg-primary text-white shadow-sm">
            <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
                <Link to="/" className="text-xl font-bold">
                    Klifurmót
                </Link>

                {/* Desktop */}
                <div className="hidden md:flex items-center gap-4">
                    {navigationItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="px-3 py-2 rounded hover:bg-primary-hover transition-colors"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-2">
                    {isAuthenticated ? (
                        <>
                            <Link
                                to="/profile"
                                className="px-3 py-2 rounded hover:bg-primary-hover transition-colors"
                            >
                                {userAccount?.user.username}
                            </Link>
                            <button
                                onClick={clearTokens}
                                className="px-3 py-2 rounded hover:bg-primary-hover transition-colors"
                            >
                                Útskrá
                            </button>
                        </>
                    ) : (
                        <Link
                            to="/login"
                            className="px-3 py-2 rounded hover:bg-primary-hover transition-colors"
                        >
                            Innskrá
                        </Link>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="md:hidden p-2 rounded hover:bg-primary-hover transition-colors"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {menuOpen ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="absolute top-16 left-0 right-0 md:hidden bg-primary border-t border-primary-hover shadow-lg">
                    <div className="flex flex-col px-4 py-2">
                        {navigationItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMenuOpen(false)}
                                className="px-3 py-3 rounded hover:bg-primary-hover transition-colors"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="border-t border-primary-hover mt-2 pt-2">
                            {isAuthenticated ? (
                                <>
                                    <Link
                                        to="/profile"
                                        onClick={() => setMenuOpen(false)}
                                        className="block px-3 py-3 rounded hover:bg-primary-hover transition-colors"
                                    >
                                        {userAccount?.user.username}
                                    </Link>
                                    <button
                                        onClick={() => {
                                            clearTokens();
                                            setMenuOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-3 rounded hover:bg-primary-hover transition-colors"
                                    >
                                        Útskrá
                                    </button>
                                </>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={() => setMenuOpen(false)}
                                    className="block px-3 py-3 rounded hover:bg-primary-hover transition-colors"
                                >
                                    Innskrá
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
