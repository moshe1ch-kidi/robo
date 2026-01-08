
import React from 'react';
import { Wifi, HandMetal, Compass, Palette, Pipette } from 'lucide-react';
import * as THREE from 'three'; // Import Three.js

interface SensorDashboardProps {
  distance: number;
  isTouching: boolean;
  gyroAngle: number;
  tiltAngle?: number;
  detectedColor: string;
  lightIntensity?: number;
  overrideColor?: string | null;
  onColorClick?: () => void;
}

// Canonical map for common color names to their representative hex values (aligned with Blockly icons)
const CANONICAL_COLOR_MAP: Record<string, string> = {
    'red': '#EF4444',
    'green': '#22C55E',
    'blue': '#3B82F6',
    'yellow': '#EAB308',
    'orange': '#F97316',
    'purple': '#A855F7',
    'cyan': '#06B6D4',
    'magenta': '#EC4899',
    'black': '#000000',
    'white': '#FFFFFF',
};

const SensorDashboard: React.FC<SensorDashboardProps> = ({ 
  distance, 
  isTouching, 
  gyroAngle, 
  tiltAngle = 0,
  detectedColor,
  lightIntensity = 100,
  overrideColor,
  onColorClick
}) => {
  
  // Helper to get color code for display
  const getDisplayColor = (colorInput: string) => {
    if (!colorInput) return '#e5e7eb';
    if (colorInput.startsWith('#')) return colorInput;

    const normalized = colorInput.toLowerCase();
    // Use the canonical map for display
    const mappedColor = CANONICAL_COLOR_MAP[normalized];
    if (mappedColor) return mappedColor;

    // Fallback for raw hex if not a recognized name
    try {
        new THREE.Color(colorInput); // Validate if it's a valid hex string
        return colorInput;
    } catch {
        return '#e5e7eb'; // Default light gray for unknown/invalid
    }
  };

  const getRgbText = (hex: string) => {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `R:${r} G:${g} B:${b}`;
  };

  const isOverrideActive = !!overrideColor;

  return (
    <div className={`absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border flex items-center justify-around z-10 transition-all ${
        isOverrideActive ? 'border-pink-500 ring-2 ring-pink-500 ring-opacity-50' : 'border-slate-200'
    }`}>
      
      {/* Ultrasonic / Distance */}
      <div className={`flex flex-col items-center gap-1 min-w-[80px] ${isOverrideActive ? 'opacity-40' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Wifi size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Distance</span>
        </div>
        <div className="text-2xl font-mono font-bold text-slate-800">
            {distance < 255 ? distance : '> 255'} <span className="text-sm text-slate-400">cm</span>
        </div>
      </div>

      <div className="w-px h-10 bg-slate-300"></div>

      {/* Gyro (Angle and Tilt) */}
      <div className={`flex flex-col items-center gap-1 min-w-[100px] ${isOverrideActive ? 'opacity-40' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Compass size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Gyro</span>
        </div>
        <div className="flex flex-col items-center leading-none">
            <div className="text-xl font-mono font-bold text-slate-800" title="Angle (0-360°)">
                <span className="text-[10px] text-slate-400 mr-1">Angle:</span>{gyroAngle}°
            </div>
            <div className={`text-sm font-mono font-bold ${Math.abs(tiltAngle) > 0.5 ? 'text-blue-600' : 'text-slate-500'}`} title="Tilt (Pitch)">
                <span className="text-[10px] text-slate-400 mr-1">Tilt:</span>{tiltAngle.toFixed(1)}°
            </div>
        </div>
      </div>

      <div className="w-px h-10 bg-slate-300"></div>

      {/* Touch Sensor */}
      <div className={`flex flex-col items-center gap-1 min-w-[80px] ${isOverrideActive ? 'opacity-40' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 text-slate-500 mb-1">
            <HandMetal size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Touch</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold border ${
            isTouching 
                ? 'bg-red-100 text-red-600 border-red-200' 
                : 'bg-slate-100 text-slate-400 border-slate-200'
        }`}>
            {isTouching ? 'PRESSED' : 'RELEASED'}
        </div>
      </div>

      <div className="w-px h-10 bg-slate-300"></div>

      {/* Color Sensor / Picker Trigger */}
      <div 
        onClick={onColorClick}
        className={`flex flex-col items-center gap-1 min-w-[140px] relative p-1 rounded-lg cursor-pointer transition-colors border border-transparent ${
            isOverrideActive 
                ? 'bg-pink-50 border-pink-200' 
                : 'hover:bg-slate-100 hover:border-slate-200'
        }`}
        title={isOverrideActive ? "Click to stop sampling" : "Click to sample color"}
      >
        <div className={`flex items-center gap-2 mb-1 ${isOverrideActive ? 'text-pink-600' : 'text-slate-500'}`}>
            {isOverrideActive ? <Pipette size={18} className="animate-bounce" /> : <Palette size={18} />}
            <span className="text-xs font-bold uppercase tracking-wider">
                {isOverrideActive ? 'Sampling...' : 'Detected Color'}
            </span>
        </div>
        
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
                <div 
                    className="w-6 h-6 rounded-full border border-slate-300 shadow-sm transition-colors duration-200"
                    style={{ backgroundColor: getDisplayColor(isOverrideActive && overrideColor ? overrideColor : detectedColor) }}
                />
                <span className="font-mono font-bold text-slate-700 text-sm">
                    {isOverrideActive && overrideColor 
                        ? getRgbText(overrideColor) 
                        : (detectedColor.toUpperCase())}
                </span>
            </div>
            {!isOverrideActive && (
                <div className="text-xs text-slate-500 font-mono">
                    Intensity: {lightIntensity}%
                </div>
            )}
            {isOverrideActive && overrideColor && (
                 <div className="text-[10px] text-pink-500 font-mono">
                    {overrideColor}
                </div>
            )}
        </div>
        
        {isOverrideActive && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
            </span>
        )}
      </div>

    </div>
  );
};

export default SensorDashboard;