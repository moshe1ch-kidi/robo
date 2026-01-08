import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three'; 
import { RotateCcw, Code2, Ruler, Trophy, X, Flag, Save, FolderOpen, Check, AlertCircle, Info, Terminal, Star, Home, Eye, Move, Hand, Bot, Target, FileCode, ZoomIn, ZoomOut } from 'lucide-react';

// נתיבים מעודכנים - הכל באותה תיקייה
import BlocklyEditor, { BlocklyEditorHandle } from './BlocklyEditor';
import Robot3D from './Robot3D';
import SimulationEnvironment from './Environment';
import { RobotState, CustomObject, ContinuousDrawing, SimulationHistory, CameraMode, EditorTool, PathShape } from '../types'; 
import Numpad from './Numpad';
import SensorDashboard from './SensorDashboard';
import RulerTool from './RulerTool';
import ColorPickerTool from './ColorPickerTool';
import CameraManager from './CameraManager';
import { CHALLENGES, Challenge } from '../data/challenges'; 
import { ThreeEvent } from '@react-three/fiber';

const TICK_RATE = 16;
const BASE_VELOCITY = 0.165; 
const BASE_TURN_SPEED = 3.9; 
const TURN_TOLERANCE = 0.5; 

// --- פונקציות עזר ---
const normalizeAngle = (angle: number) => (angle % 360 + 360) % 360;

const getAngleDifference = (angle1: number, angle2: number) => {
    let diff = normalizeAngle(angle1 - angle2);
    if (diff > 180) diff -= 360;
    return diff;
};

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

const isColorClose = (hex1: string, hex2: string, threshold = 0.2) => {
    try {
        if (!hex1 || !hex2) return false;
        const h1 = hex1.toLowerCase();
        const h2 = hex2.toLowerCase();
        if (h1 === h2) return true;
        const finalH1 = CANONICAL_COLOR_MAP[h1] || (h1.startsWith('#') ? h1 : '#' + h1);
        const finalH2 = CANONICAL_COLOR_MAP[h2] || (h2.startsWith('#') ? h2 : '#' + h2);
        const c1 = new THREE.Color(finalH1);
        const c2 = new THREE.Color(finalH2);
        const dr = c1.r - c2.r;
        const dg = c1.g - c2.g;
        const db = c1.b - c2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db) < threshold;
    } catch (e) {
        return false;
    }
};

const getLocalCoords = (px: number, pz: number, objX: number, objZ: number, rotation: number) => {
    const dx = px - objX;
    const dz = pz - objZ;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    return { lx: dx * cos - dz * sin, lz: dx * sin + dz * cos };
};

const getEnvironmentConfig = (challengeId?: string, customObjects: CustomObject[] = []) => {
    let walls: { minX: number, maxX: number, minZ: number, maxZ: number }[] = [];
    let complexZones: any[] = [];
    customObjects.forEach(obj => {
        if (obj.type === 'WALL') {
            const hW = obj.width / 2; const hL = obj.length / 2;
            walls.push({ minX: obj.x - hW, maxX: obj.x + hW, minZ: obj.z - hL, maxZ: obj.z + hL });
        } else {
            complexZones.push({ ...obj, color: obj.color ? parseInt(obj.color.replace('#', '0x'), 16) : 0x000000 });
        }
    });
    return { walls, complexZones };
};

const getSurfaceHeightAt = (qx: number, qz: number, challengeId?: string, customObjects: CustomObject[] = []) => {
    let maxHeight = 0;
    customObjects.forEach(obj => {
        if (obj.type === 'RAMP') {
            const { lx, lz } = getLocalCoords(qx, qz, obj.x, obj.z, obj.rotation || 0);
            const hW = obj.width / 2; const hL = obj.length / 2;
            if (Math.abs(lx) <= hW && Math.abs(lz) <= hL) {
                const section = obj.length / 3;
                const uphillEnd = -hL + section;
                const downhillStart = hL - section;
                let currentY = 0;
                if (lz < uphillEnd) currentY = ((lz - (-hL)) / section) * (obj.height || 1);
                else if (lz < downhillStart) currentY = (obj.height || 1);
                else currentY = (obj.height || 1) - (((lz - downhillStart) / section) * (obj.height || 1));
                maxHeight = Math.max(maxHeight, currentY);
            }
        }
    });
    return maxHeight;
};

const calculateSensorReadings = (x: number, z: number, rotation: number, challengeId?: string, customObjects: CustomObject[] = []) => {
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const env = getEnvironmentConfig(challengeId, customObjects);
    
    const h = getSurfaceHeightAt(x, z, challengeId, customObjects);

    // לוגיקת זיהוי צבע פשוטה למטרת התיקון
    let detectedColor = "white";
    const cx = x + sin * 0.9;
    const cz = z + cos * 0.9;

    for (const zone of env.complexZones) {
        const { lx, lz } = getLocalCoords(cx, cz, zone.x, zone.z, zone.rotation || 0);
        if (Math.abs(lx) <= zone.width / 2 && Math.abs(lz) <= zone.length / 2) {
            detectedColor = zone.color.toString(16);
            break;
        }
    }

    return {
        gyro: Math.round(normalizeAngle(rotation)),
        y: h,
        tilt: 0,
        roll: 0,
        isTouching: false,
        distance: 255,
        color: detectedColor,
    };
};

// --- הקומפוננטה הראשית ---
const App: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [isColorPickerActive, setIsColorPickerActive] = useState(false);
    const [customObjects, setCustomObjects] = useState<CustomObject[]>([]);
    const [cameraMode, setCameraMode] = useState<CameraMode>('HOME');
    const [editorTool, setEditorTool] = useState<EditorTool>('NONE');
    const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
    
    // התיקון הקריטי: useRef במקום useState עבור פונקציית Blockly
    const blocklyColorPickCallbackRef = useRef<((newColor: string) => void) | null>(null);

    const robotRef = useRef<RobotState>({ 
        x: 0, y: 0, z: 0, rotation: 180, tilt: 0, roll: 0, speed: 100, 
        motorLeftSpeed: 0, motorRightSpeed: 0, ledLeftColor: 'black', 
        ledRightColor: 'black', isMoving: false, isTouching: false, 
        penDown: false, penColor: '#000000' 
    });
    
    const [robotState, setRobotState] = useState<RobotState>(robotRef.current);
    const controlsRef = useRef<any>(null);
    const blocklyEditorRef = useRef<BlocklyEditorHandle>(null);

    const handleReset = useCallback(() => {
        const startX = activeChallenge?.startPosition?.x ?? 0;
        const startZ = activeChallenge?.startPosition?.z ?? 0;
        const startRot = activeChallenge?.startRotation ?? 180;
        const newState = { ...robotRef.current, x: startX, z: startZ, rotation: startRot, motorLeftSpeed: 0, motorRightSpeed: 0 };
        robotRef.current = newState;
        setRobotState(newState);
        setIsRunning(false);
    }, [activeChallenge]);

    // פונקציה שמופעלת כשדוגם הצבע נסגר עם צבע נבחר
    const handlePickerSelect = useCallback((hexColor: string) => {
        if (blocklyColorPickCallbackRef.current) {
            blocklyColorPickCallbackRef.current(hexColor);
        }
        setIsColorPickerActive(false);
        blocklyColorPickCallbackRef.current = null;
    }, []);

    // פונקציה ש-Blockly קורא לה כדי לבקש פתיחת דוגם צבע
    const showBlocklyColorPicker = useCallback((onPick: (newColor: string) => void) => {
        setIsColorPickerActive(true);
        blocklyColorPickCallbackRef.current = onPick;
    }, []);

    return (
        <main className="flex h-screen w-screen bg-slate-900 overflow-hidden font-sans text-slate-200">
            <div className="flex-1 relative bg-slate-800">
                <Canvas shadows>
                    <CameraManager mode={cameraMode} robotState={robotState} />
                    <OrbitControls ref={controlsRef} makeDefault />
                    <SimulationEnvironment challenge={activeChallenge} customObjects={customObjects} />
                    <Robot3D state={robotState} />
                    
                    {isColorPickerActive && (
                        <ColorPickerTool 
                            onColorHover={() => {}} 
                            onColorSelect={handlePickerSelect} 
                        />
                    )}
                </Canvas>

                {/* כפתורי בקרה מהירים */}
                <div className="absolute top-4 left-4 flex gap-2">
                    <button onClick={handleReset} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors">
                        <RotateCcw size={20} />
                    </button>
                    <button 
                        onClick={() => setCameraMode(prev => prev === 'HOME' ? 'TOP' : 'HOME')} 
                        className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors"
                    >
                        <Eye size={20} />
                    </button>
                </div>
            </div>

            <div className="w-[450px] bg-slate-900 border-l border-slate-700 flex flex-col">
                <BlocklyEditor 
                    ref={blocklyEditorRef}
                    onColorPickerRequest={showBlocklyColorPicker}
                />
            </div>
        </main>
    );
};

export default App;
