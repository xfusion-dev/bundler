import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, User, Settings, LogOut, Copy, Check } from 'lucide-react';
import { Principal } from '@dfinity/principal';

interface UserDropdownProps {
  principal: Principal;
  onSignOut: () => void;
}

export default function UserDropdown({ principal, onSignOut }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const principalText = principal.toText();
  const shortPrincipal = `${principalText.slice(0, 5)}...${principalText.slice(-3)}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyPrincipal = async () => {
    try {
      await navigator.clipboard.writeText(principalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-primary hover:text-accent transition-colors"
      >
        <div className="w-8 h-8 bg-elevated border border-primary rounded flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium font-mono">{shortPrincipal}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

             {/* Dropdown Menu */}
       <AnimatePresence>
         {isOpen && (
           <motion.div
             className="absolute right-0 top-full mt-2 w-64 bg-surface border border-primary rounded p-2 z-[9999] shadow-xl"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ position: 'absolute' }}
          >
                         {/* User Info */}
             <div className="px-3 py-3 border-b border-primary">
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-primary text-sm font-medium flex-1">
                   Internet Identity
                 </span>
                 <button
                   onClick={copyPrincipal}
                   className="text-tertiary hover:text-primary transition-colors"
                   title="Copy Principal"
                 >
                   {copied ? (
                     <Check className="w-3 h-3 text-green-400" />
                   ) : (
                     <Copy className="w-3 h-3" />
                   )}
                 </button>
               </div>
               <div className="text-tertiary text-xs font-mono mb-1 truncate">
                 {principalText}
               </div>
               <div className="text-green-400 text-xs">
                 • Connected
               </div>
             </div>

            {/* Menu Items */}
            <div className="py-2">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-secondary hover:text-primary hover:bg-elevated rounded transition-colors">
                <User className="w-4 h-4" />
                <span className="text-sm">Profile</span>
              </button>
              
              <button className="w-full flex items-center gap-3 px-3 py-2 text-secondary hover:text-primary hover:bg-elevated rounded transition-colors">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </button>
            </div>

            {/* Sign Out */}
            <div className="pt-2 border-t border-primary">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 