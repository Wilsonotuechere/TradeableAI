import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "./user-menu";

const navItems = [
  { path: "/", label: "Home", icon: "🏠" },
  { path: "/chat", label: "AI Chat", icon: "💬" },
  { path: "/market", label: "Market", icon: "📊" },
  { path: "/news", label: "News", icon: "📰" },
  { path: "/history", label: "History", icon: "📜" },
];

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full bg-navy/80 backdrop-blur-md border-b border-electric/20 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-electric to-neon flex items-center justify-center">
            <BarChart3 className="text-white text-sm" size={16} />
          </div>
          <span className="font-grotesk font-bold text-xl text-off-white">Tradeable</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "text-off-white/80 hover:text-electric transition-colors duration-200",
                location === item.path && "text-electric"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* User Menu */}
        <div className="hidden md:block">
          <UserMenu />
        </div>
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-off-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-navy/95 backdrop-blur-md border-t border-electric/20">
          <div className="px-6 py-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center space-x-3 text-off-white/80 hover:text-electric transition-colors duration-200",
                  location === item.path && "text-electric"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="pt-4 border-t border-electric/20">
              <UserMenu />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
