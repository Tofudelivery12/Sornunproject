"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: '📈 Dashboard', href: '/' },
    { name: '📦 คลังสินค้า (CRUD)', href: '/products' },
    { name: '🗂️ จัดการหมวดหมู่', href: '/categories' },
  ];

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="font-bold text-xl flex items-center gap-2 text-blue-400">
            ⚡ Sornun_Stock
          </div>
          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === item.href ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white focus:outline-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu Links */}
      {isOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 px-2 pt-2 pb-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 rounded-md text-base font-medium ${
                pathname === item.href ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}