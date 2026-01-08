
import React, { useState, useEffect } from 'react';
import { Delete, Check, X } from 'lucide-react';

interface NumpadProps {
  isOpen: boolean;
  initialValue: string | number;
  onClose: () => void;
  onConfirm: (value: number) => void;
}

const Numpad: React.FC<NumpadProps> = ({ isOpen, initialValue, onClose, onConfirm }) => {
  const [display, setDisplay] = useState('0');
  const [hasStartedTyping, setHasStartedTyping] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplay(String(initialValue));
      setHasStartedTyping(false); // Reset typing state when opened
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleNumber = (num: string) => {
    if (!hasStartedTyping) {
      // First key press clears the previous value
      if (num === '.') {
        setDisplay('0.');
      } else {
        setDisplay(num);
      }
      setHasStartedTyping(true);
    } else {
      if (display === '0' && num !== '.') {
        setDisplay(num);
      } else {
        // Prevent multiple decimals
        if (num === '.' && display.includes('.')) return;
        setDisplay(display + num);
      }
    }
  };

  const handleBackspace = () => {
    setHasStartedTyping(true);
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleToggleSign = () => {
    setHasStartedTyping(true);
    if (display.startsWith('-')) {
      setDisplay(display.substring(1));
    } else {
      if (display !== '0' && display !== '') {
        setDisplay('-' + display);
      } else if (display === '0') {
        setDisplay('-'); // Allow starting with a minus
      }
    }
  };

  const handleConfirm = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      onConfirm(val);
    } else if (display === '-') {
      onConfirm(0);
    }
    onClose();
  };

  // Scratch 3.0 inspired colors
  const scratchColors = {
    blue: '#4C97FF',   // Motion
    green: '#59C059',  // Operators
    orange: '#FFAB19', // Control
    red: '#FF6680',    // Events
    text: '#575E75',   // Standard Scratch Text
    bg: '#F9F9F9',
    buttonBg: '#F0F3F8'
  };

  return (
    <div className="fixed inset-0 z-[300000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div 
        className="bg-white p-6 rounded-[24px] shadow-2xl w-80 border-4 animate-in zoom-in duration-150" 
        style={{ borderColor: scratchColors.blue }}
      >
        
        {/* Display Screen */}
        <div className="bg-slate-100 p-5 rounded-[16px] mb-5 text-right border-2 border-slate-200 shadow-inner">
          <span 
            className="text-4xl font-bold tracking-wider block h-10 overflow-hidden" 
            style={{ color: scratchColors.text, fontFamily: '"Rubik", sans-serif' }}
          >
            {display}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(String(num))}
              className="text-2xl font-bold py-4 rounded-[14px] shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] transition-all hover:bg-slate-200"
              style={{ backgroundColor: scratchColors.buttonBg, color: scratchColors.text }}
            >
              {num}
            </button>
          ))}
          
          <button
            onClick={() => handleNumber('.')}
            className="text-2xl font-bold py-4 rounded-[14px] shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] transition-all hover:bg-slate-200"
            style={{ backgroundColor: scratchColors.buttonBg, color: scratchColors.text }}
          >
            .
          </button>
          
          <button
            onClick={() => handleNumber('0')}
            className="text-2xl font-bold py-4 rounded-[14px] shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] transition-all hover:bg-slate-200"
            style={{ backgroundColor: scratchColors.buttonBg, color: scratchColors.text }}
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            className="flex items-center justify-center py-4 rounded-[14px] shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] transition-all text-white hover:opacity-90"
            style={{ backgroundColor: scratchColors.orange }}
          >
            <Delete size={28} />
          </button>
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
            <button
                onClick={handleToggleSign}
                className="text-3xl font-bold py-3 rounded-[14px] flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] transition-all text-white hover:opacity-90"
                style={{ backgroundColor: scratchColors.blue }}
                title="Toggle Negative"
            >
                -
            </button>
            <button
                onClick={onClose}
                className="py-3 rounded-[14px] flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] transition-all text-white hover:opacity-90"
                style={{ backgroundColor: scratchColors.red }}
            >
                <X size={28} />
            </button>
            <button
                onClick={handleConfirm}
                className="py-3 rounded-[14px] flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] transition-all text-white hover:opacity-90"
                style={{ backgroundColor: scratchColors.green }}
            >
                <Check size={32} strokeWidth={3} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default Numpad;