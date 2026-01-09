
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { RotateCcw, Code2, Ruler, Trophy, X, Flag, Save, FolderOpen, Download, Upload, FileJson, ZoomIn, ZoomOut, Maximize, Home, Eye, Move, Hammer, Trash2, Mountain, Map as MapIcon, Square, Palette, Undo, Trash, Settings2, ChevronRight, ChevronLeft, CornerDownRight, MoveUpRight, GripHorizontal, PlusCircle, Check, AlertCircle, Hand, Copy, ExternalLink, Info, Bot, Terminal, LayoutList, Star, ShieldCheck, Settings, Key, BookOpen, Crown, PlayCircle, Edit3, EyeOff, RefreshCcw, FileUp, Zap, Gauge, Flame, LogOut, PenLine } from 'lucide-react';
import { Vector3, MOUSE, Color } from 'three';
import BlocklyEditor, { BlocklyEditorHandle } from './components/BlocklyEditor';
import Robot3D from './components/Robot3D';
import SimulationEnvironment from './components/Environment';
import { RobotState, EditorTool, CameraMode, PathShape, CustomObject, DrawingSegment } from './types';
import Numpad from './components/Numpad';
import SensorDashboard from './components/SensorDashboard';
import RulerTool from './components/RulerTool';
import ColorPickerTool from './components/ColorPickerTool';
import { ChallengeBuilderUI } from './components/ChallengeBuilderUI';
import { CHALLENGES, Challenge, SimulationHistory } from './data/challenges';

const TICK_RATE = 16; 
const BASE_VELOCITY = 0.055; 
const BASE_TURN_SPEED = 0.13; 

const DROPPER_CURSOR_URL = `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZHRoPSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlYzQ4OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtdW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yIDIybDUtNSIvPjxwYXRoIGQ9Ik0xNS41NCA4LjQ2YTUgNSAwIDEgMC03LjA3IDcuMDdsMS40MSAxLjQxYTIgMiAwIDAgMCAyLjgzIDBsMi44My0yLjgzYTIgMiAwIDAgMCAwLTIuODNsLTEuNDEtMS40MXoiLz48L3N2Zz4nKSAwIDI0LCBjcm9zc2hhaXI=`;

const DEFAULT_CHECK = (start: RobotState, end: RobotState, history: SimulationHistory) => history.maxDistanceMoved > 5;

const isColorClose = (hex1: string, hex2: string, threshold = 0.4) => {
    try {
        if (!hex1 || !hex2) return false;
        const h1 = hex1.toLowerCase();
        const h2 = hex2.toLowerCase();
        if (h1 === h2) return true;
        const colorMap: Record<string, string> = {
            'red': '#FF0000', 'green': '#22C55E', 'blue': '#3B82F6', 'yellow': '#FACC15',
            'magenta': '#D946EF', 'cyan': '#06B6D4', 'black': '#000000', 'white': '#FFFFFF',
            'orange': '#F97316', 'purple': '#8B5CF6'
        };
        const finalH1 = colorMap[h1] || (h1.startsWith('#') ? h1 : '#' + h1);
        const finalH2 = colorMap[h2] || (h2.startsWith('#') ? h2 : '#' + h2);
        const c1 = new Color(finalH1);
        const c2 = new Color(finalH2);
        // Fix: Replace non-existent Color.distanceTo with manual Euclidean distance calculation in RGB space.
        const dist = Math.sqrt(
            Math.pow(c1.r - c2.r, 2) + 
            Math.pow(c1.g - c2.g, 2) + 
            Math.pow(c1.b - c2.b, 2)
        );
        return dist < threshold;
    } catch (e) { return false; }
};

const isPointInObject = (px: number, pz: number, obj: CustomObject) => {
    const dx = px - obj.x; const dz = pz - obj.z;
    const cos = Math.cos(-(obj.rotation || 0)); const sin = Math.sin(-(obj.rotation || 0));
    const localX = dx * cos - dz * sin; const localZ = dx * sin + dz * cos;
    const halfW = obj.width / 2; 
    const halfL = (obj.type === 'PATH' && obj.shape === 'CORNER') ? obj.width / 2 : obj.length / 2;
    return Math.abs(localX) <= halfW && Math.abs(localZ) <= halfL;
};

const getSurfaceHeightAt = (qx: number, qz: number, challengeId?: string, customObjects: CustomObject[] = []) => {
    let maxHeight = 0;
    customObjects.filter(o => o.type === 'RAMP').forEach(ramp => {
        const dx = qx - ramp.x; const dz = qz - ramp.z;
        const cR = Math.cos(-(ramp.rotation || 0)); const sR = Math.sin(-(ramp.rotation || 0));
        const lX = dx * cR - dz * sR; const lZ = dx * sR + dz * cR;
        const hW = ramp.width / 2; const hL = ramp.length / 2; const h = ramp.height || 1.2;
        if (Math.abs(lX) <= hW && Math.abs(lZ) <= hL) {
            const section = ramp.length / 3; const uphillEnd = -hL + section; const downhillStart = hL - section;
            let currentY = 0;
            if (lZ < uphillEnd) currentY = ((lZ - (-hL)) / section) * h;
            else if (lZ < downhillStart) currentY = h;
            else currentY = h - (((lZ - downhillStart) / section) * h);
            maxHeight = Math.max(maxHeight, currentY);
        }
    });
    return maxHeight;
};

const calculateSensorReadings = (x: number, z: number, rotation: number, challengeId?: string, customObjects: CustomObject[] = []) => {
    const rad = (rotation * Math.PI) / 180; const sin = Math.sin(rad); const cos = Math.cos(rad);
    const env = getEnvironmentConfig(challengeId, customObjects);
    const gyro = Math.round(((rotation % 360) + 360) % 360);
    
    const checkPhysicsHit = (px: number, pz: number) => {
        for (const w of env.walls) { if (px >= w.minX && px <= w.maxX && pz >= w.minZ && pz <= w.maxZ) return true; }
        for (const obj of customObjects) { if (obj.type === 'WALL' || obj.type === 'RAMP') { if (isPointInObject(px, pz, obj)) return true; } }
        return false;
    };

    const getWheelWorldPos = (lx: number, lz: number) => ({
        wx: x + (lx * Math.cos(rad) + lz * Math.sin(rad)),
        wz: z + (-lx * Math.sin(rad) + lz * Math.cos(rad))
    });
    const leftW = getWheelWorldPos(-0.95, 0.5); const rightW = getWheelWorldPos(0.95, 0.5); const backW = getWheelWorldPos(0, -0.8);
    const hLeft = getSurfaceHeightAt(leftW.wx, leftW.wz, challengeId, customObjects);
    const hRight = getSurfaceHeightAt(rightW.wx, rightW.wz, challengeId, customObjects);
    const hBack = getSurfaceHeightAt(backW.wx, backW.wz, challengeId, customObjects);
    const y = (hLeft + hRight + hBack) / 3;
    const frontAvg = (hLeft + hRight) / 2;
    const tilt = Math.atan2(frontAvg - hBack, 1.3) * (180 / Math.PI);
    const roll = Math.atan2(hLeft - hRight, 1.9) * (180 / Math.PI);

    const sensorGroundProjectionDist = 0.9 * Math.cos(tilt * (Math.PI / 180)) - (-0.1) * Math.sin(tilt * (Math.PI / 180));
    const cx = x + sin * sensorGroundProjectionDist; const cz = z + cos * sensorGroundProjectionDist;
    let color = "white"; let rawDecimalColor = 0xFFFFFF;
    
    for (const zZone of env.complexZones) {
        const dx = cx - zZone.x; const dz = cz - zZone.z;
        const cR = Math.cos(-zZone.rotation); const sR = Math.sin(-zZone.rotation);
        const lX = dx * cR - dz * sR; const lZ = dx * sR + dz * cR;
        let onLine = false; const lineTolerance = 0.4;
        if (zZone.shape === 'STRAIGHT' || !zZone.shape) { if (Math.abs(lX) <= lineTolerance && Math.abs(lZ) <= zZone.length / 2) onLine = true; }
        else if (zZone.shape === 'CORNER') { if (Math.abs(lX) <= lineTolerance && lZ >= -zZone.width/2 && lZ <= zZone.width/2) onLine = true; if (Math.abs(lZ) <= lineTolerance && lX >= -zZone.width/2 && lX <= zZone.width/2) onLine = true; }
        else if (zZone.shape === 'CURVED') {
            const radius = zZone.length / 2; const dist = Math.sqrt(Math.pow(lX - (-radius), 2) + Math.pow(lZ - 0, 2));
            if (Math.abs(dist - radius) <= lineTolerance) { const angle = Math.atan2(lZ, lX + radius); if (angle >= 0 && angle <= Math.PI/2) onLine = true; }
        }
        if (onLine) {
            rawDecimalColor = zZone.color; const hexStr = "#" + rawDecimalColor.toString(16).padStart(6, '0').toUpperCase();
            if (isColorClose(hexStr, "#ef4444")) color = "red"; else if (isColorClose(hexStr, "#3B82F6")) color = "blue"; else if (isColorClose(hexStr, "#22C55E")) color = "green"; else if (isColorClose(hexStr, "#FACC15")) color = "yellow"; else if (isColorClose(hexStr, "#D946EF")) color = "magenta"; else if (isColorClose(hexStr, "#000000")) color = "black"; else color = hexStr;
            break; 
        }
    }

    const physicalStopDist = 1.45;
    const touchTriggerDist = 1.55; 

    const checkBumperHit = (dist: number) => {
        const lateralOffset = 0.7;
        const points = [
            { lx: 0, lz: dist },
            { lx: -lateralOffset, lz: dist },
            { lx: lateralOffset, lz: dist }
        ];
        for (const p of points) {
            const wx = x + (p.lx * Math.cos(rad) + p.lz * Math.sin(rad));
            const wz = z + (-p.lx * Math.sin(rad) + p.lz * Math.cos(rad));
            if (checkPhysicsHit(wx, wz)) return true;
        }
        return false;
    };

    const physicalHit = checkBumperHit(physicalStopDist);
    let isTouching = checkBumperHit(touchTriggerDist);

    const ultrasonicStartDist = 1.5;
    let distance = 255; const scanStep = 0.05; 
    for (let d = 0; d < 40.0; d += scanStep) {
        const tx = x + sin * (ultrasonicStartDist + d); const tz = z + cos * (ultrasonicStartDist + d);
        if (checkPhysicsHit(tx, tz)) { 
            distance = Math.round(d * 10); 
            break; 
        }
    }
    
    if (physicalHit) {
        distance = 0;
        isTouching = true;
    }
    
    return { gyro, tilt, roll, y, isTouching, physicalHit, distance, color, intensity: 100, rawDecimalColor, sensorX: cx, sensorZ: cz };
};

const getEnvironmentConfig = (challengeId?: string, customObjects: CustomObject[] = []) => {
    let walls: {minX: number, maxX: number, minZ: number, maxZ: number}[] = [];
    let complexZones: {x: number, z: number, width: number, length: number, rotation: number, color: number, shape?: PathShape}[] = [];
    if (['c10', 'c16', 'c19', 'c20', 'c_maze_original'].includes(challengeId || '')) {
        if (challengeId === 'c10') walls.push({ minX: -3, maxX: 3, minZ: -10.25, maxZ: -9.75 });
    }
    customObjects.forEach(obj => {
        if (obj.type === 'PATH') { complexZones.push({ x: obj.x, z: obj.z, width: obj.width, length: obj.length, rotation: obj.rotation || 0, color: parseInt((obj.color || '#FFFF00').replace('#', '0x'), 16), shape: obj.shape || 'STRAIGHT' }); } 
        else if (obj.type === 'COLOR_LINE') { complexZones.push({ x: obj.x, z: obj.z, width: obj.width, length: obj.length, rotation: obj.rotation || 0, color: parseInt((obj.color || '#FF0000').replace('#', '0x'), 16) }); }
    });
    return { walls, complexZones };
};

const CameraFollower = ({ targetX, targetY, targetZ, mode, resetKey, zoomKey, zoomDirection, controlsRef }: { targetX: number, targetY: number, targetZ: number, mode: CameraMode, resetKey: number, zoomKey: number, zoomDirection: 'in' | 'out' | null, controlsRef: React.RefObject<any> }) => {
    const { camera } = useThree(); const lastTarget = useRef(new Vector3(targetX, targetY, targetZ));
    const PRESETS = useMemo(() => ({ HOME: { pos: new Vector3(5, 8, 8), target: new Vector3(0, 0, 0) }, TOP: { pos: new Vector3(0, 15, 0), target: new Vector3(0, 0, 0) } }), []);
    useEffect(() => {
        const c = controlsRef.current; if (!c) return;
        if (mode === 'HOME' || (mode === 'FOLLOW' && resetKey > 0)) { camera.position.copy(PRESETS.HOME.pos); c.target.copy(PRESETS.HOME.target); }
        else if (mode === 'TOP') { camera.position.copy(PRESETS.TOP.pos); camera.position.y = 15; c.target.set(0, 0, 0); }
        c.update();
    }, [mode, resetKey, PRESETS, camera, controlsRef]);
    useEffect(() => {
        const c = controlsRef.current; if (zoomKey > 0 && c) {
            const f = zoomDirection === 'in' ? 0.8 : 1.25; camera.position.copy(c.target).add(new Vector3().subVectors(camera.position, c.target).multiplyScalar(f)); c.update();
        }
    }, [zoomKey, zoomDirection, camera, controlsRef]);
    useFrame(() => {
        const c = controlsRef.current; const current = new Vector3(targetX, targetY - 0.6, targetZ);
        const d = new Vector3().subVectors(current, lastTarget.current);
        if (mode === 'FOLLOW' && c) { camera.position.add(d); if (c.target) { c.target.add(d); c.update(); } }
        lastTarget.current.copy(current);
    });
    return null;
};

const ProjectModal = ({ isOpen, mode, onClose, onSaveToFile, onLoad }: { isOpen: boolean, mode: 'save' | 'load', onClose: () => void, onSaveToFile: (name: string) => void, onLoad: (data: string) => void }) => {
    const [name, setName] = useState('My Robot Project'); const fileInputRef = useRef<HTMLInputElement>(null); if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border-4 border-slate-200">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50"><h2 className="text-xl font-bold text-slate-800">{mode === 'save' ? 'שמירת פרויקט' : 'טעינת פרויקט'}</h2><button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button></div>
                <div className="p-8">
                    {mode === 'save' ? (
                        <div className="space-y-6">
                            <div><label className="block text-slate-600 font-bold mb-2">שם הפרויקט:</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-lg" /></div>
                            <button onClick={() => onSaveToFile(name)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-3"><Download size={24} /> שמור לקובץ</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <input ref={fileInputRef} type="file" accept=".robocode,.xml,.json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { if (ev.target?.result) { onLoad(ev.target.result as string); onClose(); } }; reader.readAsText(file); } }} />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-12 border-4 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-4"><FolderOpen size={48} /> בחר קובץ מהמחשב</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PythonCodeModal = ({ isOpen, code, onClose, onCopy }: { isOpen: boolean, code: string, onClose: () => void, onCopy: () => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200 border-4 border-blue-500">
                <div className="p-6 border-b flex justify-between items-center bg-blue-50"><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Terminal className="text-blue-600" /> המרת קוד ל-Python</h2><button onClick={onClose} className="p-2 hover:bg-blue-100 rounded-full text-blue-400"><X size={24} /></button></div>
                <div className="p-6 bg-slate-900 overflow-hidden relative"><div className="max-h-96 overflow-y-auto font-mono text-sm text-blue-300 p-4 text-left" dir="ltr"><pre className="whitespace-pre-wrap">{code}</pre></div><button onClick={onCopy} className="absolute top-4 right-4 p-2 bg-slate-800 text-blue-400 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700" title="Copy code"><Copy size={18} /></button></div>
                <div className="p-4 bg-slate-50 flex justify-end"><button onClick={onClose} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all">סגור</button></div>
            </div>
        </div>
    );
};

const ImportChallengeModal = ({ isOpen, onClose, onImport }: { isOpen: boolean, onClose: () => void, onImport: (code: string) => void }) => {
    const [code, setCode] = useState(''); const fileInputRef = useRef<HTMLInputElement>(null); if (!isOpen) return null;
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { const content = ev.target?.result as string; if (content) { onImport(content); onClose(); } }; reader.readAsText(file); };
    return (
        <div className="fixed inset-0 z-[110000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200 border-4 border-blue-400">
                <div className="p-6 border-b flex justify-between items-center bg-blue-50"><h2 className="text-xl font-bold text-slate-800 text-right">ייבוא אתגר</h2><button onClick={onClose} className="p-2 hover:bg-blue-100 rounded-full text-blue-400"><X size={24} /></button></div>
                <div className="p-8 space-y-6 text-right">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4"><p className="text-slate-600 text-sm font-bold flex items-center gap-2 justify-end"><FileUp size={18} className="text-blue-500" /> טען מקובץ:</p><input ref={fileInputRef} type="file" accept=".json,.challenge,.txt" className="hidden" onChange={handleFileChange} /><button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-4 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2"><FolderOpen size={32} />בחר קובץ מהמחשב</button></div>
                        <div className="space-y-4"><p className="text-slate-600 text-sm font-bold flex items-center gap-2 justify-end"><AlertCircle size={18} className="text-blue-500" /> או הדבק קוד:</p><textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none h-32 font-mono text-xs bg-slate-50 text-left" dir="ltr" placeholder="{ id: 'community...', ... }" /></div>
                    </div>
                    <button onClick={() => code.trim() && onImport(code)} disabled={!code.trim()} className={`w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${code.trim() ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-300'}`}><Download size={24} /> ייבא מתיבת הטקסט</button>
                </div>
            </div>
        </div>
    );
};

const AdminModal = ({ isOpen, onClose, onLogin, onLogout, isAdmin }: { isOpen: boolean, onClose: () => void, onLogin: (pw: string) => void, onLogout: () => void, isAdmin: boolean }) => {
    const [pw, setPw] = useState(''); if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border-4 border-purple-500">
                <div className="p-6 bg-purple-50 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-purple-800 flex items-center gap-2"><ShieldCheck /> {isAdmin ? 'ניהול מחובר' : 'כניסת מנהל'}</h2><button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-full text-purple-400"><X size={24} /></button></div>
                <div className="p-8 space-y-4">
                    {isAdmin ? (
                        <div className="text-center space-y-6">
                            <p className="text-slate-600 font-bold text-lg">המורה, הנך מחובר כעת למערכת הניהול.</p>
                            <button onClick={() => { onLogout(); onClose(); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-500 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"><LogOut size={22} /> התנתק ממצב ניהול</button>
                        </div>
                    ) : (
                        <>
                            <label className="block text-slate-600 font-bold">סיסמה:</label>
                            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 outline-none" onKeyDown={(e) => e.key === 'Enter' && onLogin(pw)} />
                            <button onClick={() => onLogin(pw)} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"><Key size={20} /> התחבר</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [startBlockCount, setStartBlockCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isColorPickerActive, setIsColorPickerActive] = useState(false);
  const [isManualPlacementMode, setIsManualPlacementMode] = useState(false);
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState<EditorTool>('NONE');
  const [selectedPathShape, setSelectedPathShape] = useState<PathShape>('STRAIGHT');
  const [customObjects, setCustomObjects] = useState<CustomObject[]>([]);
  const [userChallenges, setUserChallenges] = useState<Challenge[]>([]);
  const [teacherChallenges, setTeacherChallenges] = useState<Challenge[]>([]);
  const [overriddenBuiltInChallenges, setOverriddenBuiltInChallenges] = useState<Challenge[]>([]);
  const [deletedBuiltInIds, setDeletedBuiltInIds] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [pythonCode, setPythonCode] = useState('');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [previewObject, setPreviewObject] = useState<CustomObject | null>(null);
  const dragStartPoint = useRef<Vector3 | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('HOME');
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [zoomKey, setZoomKey] = useState(0);
  const [zoomDirection, setZoomDirection] = useState<'in' | 'out' | null>(null);
  const [pickerHoverColor, setPickerHoverColor] = useState<string | null>(null);
  const [showChallenges, setShowChallenges] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [challengeSuccess, setChallengeSuccess] = useState(false);
  const [projectModal, setProjectModal] = useState<{isOpen: boolean, mode: 'save' | 'load'}>({isOpen: false, mode: 'save'});
  const [monitoredValues, setMonitoredValues] = useState<Record<string, any>>({});
  const [visibleVariables, setVisibleVariables] = useState<Set<string>>(new Set());
  const blocklyEditorRef = useRef<BlocklyEditorHandle>(null);
  const controlsRef = useRef<any>(null);
  const historyRef = useRef<SimulationHistory>({ maxDistanceMoved: 0, touchedWall: false, detectedColors: [], totalRotation: 0 });
  const colorPickerCallbackRef = useRef<((newColor: string) => void) | null>(null);
  const executionId = useRef(0);
  const [numpadConfig, setNumpadConfig] = useState({ isOpen: false, value: 0, onConfirm: (val: number) => {} });
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  const [customStartPosition, setCustomStartPosition] = useState<{x: number, z: number, rotation: number} | null>(null);
  const [drawings, setDrawings] = useState<DrawingSegment[]>([]);
  const lastDrawingPos = useRef<[number, number, number] | null>(null);
  const robotRef = useRef<RobotState>({ x: 0, y: 0, z: 0, rotation: 180, tilt: 0, roll: 0, speed: 100, motorLeftSpeed: 0, motorRightSpeed: 0, ledLeftColor: 'black', ledRightColor: 'black', isMoving: false, isTouching: false, penDown: false, penColor: '#000000' });
  const [robotState, setRobotState] = useState<RobotState>(robotRef.current);
  const abortControllerRef = useRef<AbortController | null>(null);
  const listenersRef = useRef<{ messages: Record<string, (() => Promise<void>)[]>, colors: { color: string, cb: () => Promise<void>, lastMatch: boolean }[], obstacles: { cb: () => Promise<void>, lastMatch: boolean }[], distances: { threshold: number, cb: () => Promise<void>, lastMatch: boolean }[], variables: Record<string, any> }>({ messages: {}, colors: [], obstacles: [], distances: [], variables: {} });

  useEffect(() => {
    window.showBlocklyNumpad = (val, cb) => {
        setNumpadConfig({ isOpen: true, value: Number(val), onConfirm: cb });
    };
    window.showBlocklyColorPicker = (cb) => {
        colorPickerCallbackRef.current = cb;
        setIsColorPickerActive(true);
    };
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user_challenges'); if (savedUser) { try { const parsed = JSON.parse(savedUser); parsed.forEach((c: Challenge) => { if (typeof c.check !== 'function') c.check = DEFAULT_CHECK; }); setUserChallenges(parsed); } catch (e) {} }
    const savedTeacher = localStorage.getItem('teacher_challenges'); if (savedTeacher) { try { const parsed = JSON.parse(savedTeacher); parsed.forEach((c: Challenge) => { if (typeof c.check !== 'function') c.check = DEFAULT_CHECK; }); setTeacherChallenges(parsed); } catch (e) {} }
    const savedOverrides = localStorage.getItem('builtin_overrides'); if (savedOverrides) { try { const parsed = JSON.parse(savedOverrides); parsed.forEach((c: Challenge) => { if (typeof c.check !== 'function') c.check = DEFAULT_CHECK; }); setOverriddenBuiltInChallenges(parsed); } catch (e) {} }
    const savedDeleted = localStorage.getItem('deleted_builtin_ids'); if (savedDeleted) { try { setDeletedBuiltInIds(JSON.parse(savedDeleted)); } catch (e) {} }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 4000); }, []);
  const handleAdminLogin = (pw: string) => { if (pw === 'admin123') { setIsAdmin(true); setIsAdminModalOpen(false); showToast("שלום המורה! מצב ניהול פעיל.", "success"); } else { showToast("סיסמה שגויה", "error"); } };
  const handleAdminLogout = useCallback(() => { setIsAdmin(false); showToast("התנתקת ממצב ניהול.", "info"); }, [showToast]);

  const handleShowPython = useCallback(() => {
    const code = blocklyEditorRef.current?.getPythonCode() || '';
    setPythonCode(code);
    setIsPythonModalOpen(true);
  }, []);

  const handleVariablesChanged = useCallback((allVarNames: string[], renameInfo?: {oldName: string, newName: string}) => {
    if (renameInfo) {
      setVisibleVariables(prev => {
        const next = new Set(prev);
        if (next.has(renameInfo.oldName)) {
          next.delete(renameInfo.oldName);
          next.add(renameInfo.newName);
        }
        return next;
      });
      setMonitoredValues(prev => {
        const next = { ...prev };
        if (renameInfo.oldName in next) {
          next[renameInfo.newName] = next[renameInfo.oldName];
          delete next[renameInfo.oldName];
        }
        return next;
      });
    }
  }, []);

  const handlePropertyChange = useCallback((updates: Partial<CustomObject> | { id: 'DELETE' }) => {
    if (!selectedObjectId) return;
    if ('id' in updates && updates.id === 'DELETE') {
      setCustomObjects(prev => prev.filter(o => o.id !== selectedObjectId));
      setSelectedObjectId(null);
    } else {
      setCustomObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, ...updates } : o));
    }
  }, [selectedObjectId]);

  const handleImportChallenge = useCallback((code: string) => {
    try {
      const challenge: Challenge = JSON.parse(code);
      if (!challenge.id || !challenge.title) throw new Error("Invalid challenge format");
      if (typeof challenge.check !== 'function') challenge.check = DEFAULT_CHECK;
      setUserChallenges(prev => {
        const updated = [...prev.filter(c => c.id !== challenge.id), challenge];
        localStorage.setItem('user_challenges', JSON.stringify(updated));
        return updated;
      });
      setActiveChallenge(challenge);
      showToast(`המשימה "${challenge.title}" יובאה בהצלחה!`, 'success');
    } catch (e) {
      showToast("שגיאה בייבוא האתגר. וודא שהפורמט תקין.", "error");
    }
  }, [showToast]);
  
  const handleRun = useCallback(async () => {
    if (isRunning) return; setIsRunning(true); setChallengeSuccess(false); 
    historyRef.current = { maxDistanceMoved: 0, touchedWall: false, detectedColors: [], totalRotation: 0 }; 
    listenersRef.current = { messages: {}, colors: [], obstacles: [], distances: [], variables: {} };
    
    const currentRunId = ++executionId.current; const controller = new AbortController(); abortControllerRef.current = controller;
    const checkAbort = () => { if (controller.signal.aborted || executionId.current !== currentRunId) { throw new Error("Simulation aborted"); } };
    
    const robot = {
      move: async (dist: number) => { 
        checkAbort(); 
        const startX = robotRef.current.x; 
        const startZ = robotRef.current.z; 
        const targetDist = Math.abs(dist) * 0.1; 
        const direction = dist > 0 ? 1 : -1; 
        
        while (true) { 
          checkAbort(); 
          const currentPos = robotRef.current;
          const moved = Math.sqrt(Math.pow(currentPos.x - startX, 2) + Math.pow(currentPos.z - startZ, 2)); 
          const remaining = targetDist - moved;
          if (remaining <= 0) break; 
          
          const pGain = 120;
          const power = Math.min(100, Math.max(15, remaining * pGain)) * direction;
          robotRef.current = { ...currentPos, motorLeftSpeed: power, motorRightSpeed: power };
          
          await new Promise(r => setTimeout(r, TICK_RATE)); 
          const sd = calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects); 
          if (sd.physicalHit) break; 
        } 
        robotRef.current = { ...robotRef.current, motorLeftSpeed: 0, motorRightSpeed: 0 }; 
      },
      turn: async (angle: number) => { 
        checkAbort(); 
        const startRot = robotRef.current.rotation; 
        while (true) { 
          checkAbort(); 
          const currentPos = robotRef.current;
          const turned = currentPos.rotation - startRot;
          const remaining = angle - turned;
          if (Math.abs(remaining) < 0.2) break; 
          const pGain = 20;
          const speed = Math.min(100, Math.max(8, Math.abs(remaining) * pGain));
          const direction = remaining > 0 ? 1 : -1;
          robotRef.current = { ...currentPos, motorLeftSpeed: -speed * direction, motorRightSpeed: speed * direction };
          await new Promise(r => setTimeout(r, TICK_RATE)); 
        } 
        robotRef.current = { ...robotRef.current, motorLeftSpeed: 0, motorRightSpeed: 0 }; 
      },
      wait: (ms: number) => new Promise((resolve, reject) => { const timeout = setTimeout(resolve, ms); controller.signal.addEventListener('abort', () => { clearTimeout(timeout); reject(new Error("Simulation aborted")); }, { once: true }); }),
      setMotorPower: async (left: number, right: number) => { checkAbort(); robotRef.current = { ...robotRef.current, motorLeftSpeed: left, motorRightSpeed: right }; },
      setSpeed: async (s: number) => { checkAbort(); robotRef.current = { ...robotRef.current, speed: s }; },
      stop: async () => { checkAbort(); robotRef.current = { ...robotRef.current, motorLeftSpeed: 0, motorRightSpeed: 0 }; },
      setPen: async (down: boolean) => { checkAbort(); robotRef.current = { ...robotRef.current, penDown: down }; setRobotState(prev => ({ ...prev, penDown: down })); },
      setPenColor: async (color: string) => { checkAbort(); robotRef.current = { ...robotRef.current, penColor: color }; setRobotState(prev => ({ ...prev, penColor: color })); },
      clearPen: async () => { checkAbort(); setDrawings([]); },
      getDistance: async () => { checkAbort(); return calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects).distance; },
      getTouch: async () => { 
        checkAbort(); 
        const sd = calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects);
        return sd.isTouching; 
      },
      getGyro: async (mode: 'ANGLE' | 'TILT') => { checkAbort(); const sd = calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects); return mode === 'TILT' ? sd.tilt : sd.gyro; },
      getColor: async () => { checkAbort(); return calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects).color; },
      isTouchingColor: async (hex: string) => { checkAbort(); const sd = calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects); return isColorClose("#" + sd.rawDecimalColor.toString(16).padStart(6, '0').toUpperCase(), hex); },
      getCircumference: async () => 3.77,
      setLed: (side: 'left' | 'right' | 'both', color: string) => { checkAbort(); const updates: any = {}; if (side === 'left' || side === 'both') updates.ledLeftColor = color; if (side === 'right' || side === 'both') updates.ledRightColor = color; robotRef.current = { ...robotRef.current, ...updates }; setRobotState(prev => ({ ...prev, ...updates })); },
      onMessage: (msg: string, cb: () => Promise<void>) => { if (executionId.current !== currentRunId) return; if (!listenersRef.current.messages[msg]) listenersRef.current.messages[msg] = []; listenersRef.current.messages[msg].push(cb); },
      sendMessage: async (msg: string) => { checkAbort(); if (listenersRef.current.messages[msg]) await Promise.all(listenersRef.current.messages[msg].map(cb => cb())); },
      onColor: (color: string, cb: () => Promise<void>) => { if (executionId.current !== currentRunId) return; listenersRef.current.colors.push({ color, cb, lastMatch: false }); },
      onObstacle: (cb: () => Promise<void>) => { if (executionId.current !== currentRunId) return; listenersRef.current.obstacles.push({ cb, lastMatch: false }); },
      onDistance: (threshold: number, cb: () => Promise<void>) => { if (executionId.current !== currentRunId) return; listenersRef.current.distances.push({ threshold, cb, lastMatch: false }); },
      updateVariable: (name: string, val: any) => { if (executionId.current === currentRunId) { setMonitoredValues(prev => ({ ...prev, [name]: val })); } },
      stopProgram: async () => { controller.abort(); setIsRunning(false); }
    };
    try { 
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor; 
        await new AsyncFunction('robot', generatedCode)(robot); 
    } catch (e: any) { 
        if (e.message !== "Simulation aborted") {
            console.error("Script error:", e); 
            setIsRunning(false);
        }
    }
  }, [isRunning, generatedCode, activeChallenge, customObjects]);

  const handleReset = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    executionId.current++; 
    
    const builtIn = CHALLENGES.find(c => c.id === activeChallenge?.id);
    if (builtIn?.environmentObjects) setCustomObjects(builtIn.environmentObjects);
    else if (activeChallenge?.environmentObjects) setCustomObjects(activeChallenge.environmentObjects); 
    else setCustomObjects([]);

    const startX = customStartPosition?.x ?? activeChallenge?.startPosition?.x ?? 0; const startZ = customStartPosition?.z ?? activeChallenge?.startPosition?.z ?? 0; const startRot = customStartPosition?.rotation ?? activeChallenge?.startRotation ?? 180;
    const d = { ...robotRef.current, x: startX, y: 0, z: startZ, rotation: startRot, motorLeftSpeed: 0, motorRightSpeed: 0, isMoving: false, ledLeftColor: 'black', ledRightColor: 'black', tilt: 0, roll: 0, penDown: false, isTouching: false };
    robotRef.current = d; setRobotState(d); setIsRunning(false); setChallengeSuccess(false); setMonitoredValues({}); setDrawings([]); lastDrawingPos.current = null; historyRef.current = { maxDistanceMoved: 0, touchedWall: false, detectedColors: [], totalRotation: 0 }; listenersRef.current = { messages: {}, colors: [], obstacles: [], distances: [], variables: {} };
  }, [activeChallenge, customStartPosition]);

  useEffect(() => { handleReset(); }, [activeChallenge, handleReset]);
  useEffect(() => {
    let interval: any; if (isRunning) { interval = setInterval(() => { 
    const current = robotRef.current; 
    const fV = (((current.motorLeftSpeed + current.motorRightSpeed) / 200.0)) * BASE_VELOCITY * (current.speed / 100.0); 
    const rV = (current.motorRightSpeed - current.motorLeftSpeed) * BASE_TURN_SPEED * 0.5 * (current.speed / 100.0); 
    const nr = current.rotation + rV; 
    const nx = current.x + Math.sin(nr * Math.PI / 180) * fV; 
    const nz = current.z + Math.cos(nr * Math.PI / 180) * fV; 
    
    const sd_next = calculateSensorReadings(nx, nz, nr, activeChallenge?.id, customObjects); 
    
    const finalX = sd_next.physicalHit ? current.x : nx;
    const finalZ = sd_next.physicalHit ? current.z : nz;
    const sd_final = calculateSensorReadings(finalX, finalZ, nr, activeChallenge?.id, customObjects);

    const next = { 
        ...current, 
        x: finalX, 
        z: finalZ, 
        y: current.y + (sd_final.y - current.y) * 0.3, 
        tilt: current.tilt + (sd_final.tilt - current.tilt) * 0.3, 
        roll: (current.roll || 0) + (sd_final.roll - (current.roll || 0)) * 0.3, 
        rotation: nr, 
        isTouching: sd_final.isTouching, 
        isMoving: Math.abs(fV) > 0.001 || Math.abs(rV) > 0.001, 
        sensorX: sd_final.sensorX, 
        sensorZ: sd_final.sensorZ 
    }; 
    
    robotRef.current = next; 
    setRobotState(next); 
    
    const currentHex = "#" + sd_final.rawDecimalColor.toString(16).padStart(6, '0').toUpperCase();
    
    listenersRef.current.colors.forEach(listener => {
        const isMatch = isColorClose(currentHex, listener.color);
        if (isMatch && !listener.lastMatch) listener.cb();
        listener.lastMatch = isMatch;
    });

    listenersRef.current.obstacles.forEach(listener => {
        if (sd_final.isTouching && !listener.lastMatch) listener.cb();
        listener.lastMatch = sd_final.isTouching;
    });

    listenersRef.current.distances.forEach(listener => {
        const isMatch = sd_final.distance < listener.threshold;
        if (isMatch && !listener.lastMatch) listener.cb();
        listener.lastMatch = isMatch;
    });

    if (sd_final.isTouching) historyRef.current.touchedWall = true; 
    historyRef.current.maxDistanceMoved = Math.max(historyRef.current.maxDistanceMoved, Math.sqrt(Math.pow(next.x - (activeChallenge?.startPosition?.x || 0), 2) + Math.pow(next.z - (activeChallenge?.startPosition?.z || 0), 2)) * 10); 
    if (!historyRef.current.detectedColors.includes(sd_final.color)) historyRef.current.detectedColors.push(sd_final.color); 
    historyRef.current.totalRotation = next.rotation - (activeChallenge?.startRotation ?? 180);
    
    if (next.penDown) { const currPos: [number, number, number] = [next.x, next.y + 0.02, next.z]; if (lastDrawingPos.current) { const distSq = Math.pow(currPos[0] - lastDrawingPos.current[0], 2) + Math.pow(currPos[2] - lastDrawingPos.current[2], 2); if (distSq > 0.001) { setDrawings(prev => [...prev, { start: lastDrawingPos.current!, end: currPos, color: next.penColor }]); lastDrawingPos.current = currPos; } } else { lastDrawingPos.current = currPos; } } else { lastDrawingPos.current = null; }
    if (activeChallenge && typeof activeChallenge.check === 'function') { if (activeChallenge.check(robotRef.current, robotRef.current, historyRef.current) && !challengeSuccess) setChallengeSuccess(true); } 
    }, TICK_RATE); } return () => clearInterval(interval);
  }, [isRunning, customObjects, activeChallenge, challengeSuccess]);

  const handleSaveChallenge = useCallback((title: string, desc: string, winCondition: string) => {
    const isTeacherAction = isAdmin; const isOverridingBuiltIn = editingChallengeId && CHALLENGES.some(c => c.id === editingChallengeId);
    const winCheck = (start: RobotState, end: RobotState, history: SimulationHistory) => { if (winCondition === 'REACH_FINISH') return end.x > 14 && end.z < -10; if (winCondition === 'DRIVE_DISTANCE') return history.maxDistanceMoved > 50; if (winCondition === 'TOUCH_ANY') return history.touchedWall; return history.maxDistanceMoved > 10; };
    const newChallenge: Challenge = { id: editingChallengeId || (isTeacherAction ? `teacher_${Date.now()}` : `user_${Date.now()}`), title, description: desc, difficulty: 'Medium', check: winCheck, startPosition: { x: robotRef.current.x, y: robotRef.current.y, z: robotRef.current.z }, startRotation: robotRef.current.rotation, environmentObjects: [...customObjects] };
    if (isTeacherAction && isOverridingBuiltIn) { const updated = [...overriddenBuiltInChallenges.filter(c => c.id !== editingChallengeId), newChallenge]; setOverriddenBuiltInChallenges(updated); localStorage.setItem('builtin_overrides', JSON.stringify(updated)); showToast(`המשימה "${title}" עודכנה!`, 'success'); }
    else if (isTeacherAction) { const updated = editingChallengeId && teacherChallenges.some(c => c.id === editingChallengeId) ? teacherChallenges.map(c => c.id === editingChallengeId ? newChallenge : c) : [...teacherChallenges, newChallenge]; setTeacherChallenges(updated); localStorage.setItem('teacher_challenges', JSON.stringify(updated)); showToast(`משימת מורה "${title}" נשמרה!`, 'success'); }
    else { const updated = [...userChallenges, newChallenge]; setUserChallenges(updated); localStorage.setItem('user_challenges', JSON.stringify(updated)); showToast(`האתגר "${title}" נשמר!`, 'success'); }
    setIsEditorMode(false); setSelectedTool('NONE'); setSelectedObjectId(null); setEditingChallengeId(null);
  }, [userChallenges, teacherChallenges, overriddenBuiltInChallenges, customObjects, isAdmin, editingChallengeId, showToast]);

  const currentBuiltInChallenges = useMemo(() => CHALLENGES.map(original => { const override = overriddenBuiltInChallenges.find(o => o.id === original.id); return override ? { ...override, isOverridden: true, check: original.check } : original; }), [overriddenBuiltInChallenges]);
  
  const sensorReadings = useMemo(() => calculateSensorReadings(robotState.x, robotState.z, robotState.rotation, activeChallenge?.id, customObjects), [robotState.x, robotState.z, robotState.rotation, activeChallenge, customObjects]);
  
  const triggerZoom = useCallback((dir: 'in' | 'out') => { setZoomDirection(dir); setZoomKey(k => k + 1); }, []);
  const handleEditorPointerDown = (e: any) => { if (isManualPlacementMode || selectedTool === 'ROBOT_MOVE') { setIsDraggingObject(true); dragStartPoint.current = e.point.clone(); return; } if (!isEditorMode || selectedTool === 'NONE' || selectedTool === 'ROTATE' || selectedTool === 'PAN') return; setIsDrawing(true); dragStartPoint.current = e.point.clone(); setSelectedObjectId(null); };
  const handleEditorPointerMove = (e: any) => { if (!dragStartPoint.current) return; if (isDraggingObject && (isManualPlacementMode || selectedTool === 'ROBOT_MOVE')) { const delta = new Vector3().subVectors(e.point, dragStartPoint.current); const nextX = robotState.x + delta.x; const nextZ = robotState.z + delta.z; const sd = calculateSensorReadings(nextX, nextZ, robotState.rotation, activeChallenge?.id, customObjects); robotRef.current = { ...robotState, x: nextX, z: nextZ, y: sd.y, tilt: sd.tilt, roll: sd.roll, sensorX: sd.sensorX, sensorZ: sd.sensorZ, isTouching: sd.isTouching }; setRobotState(robotRef.current); dragStartPoint.current = e.point.clone(); } else if (isDraggingObject && selectedObjectId) { const delta = new Vector3().subVectors(e.point, dragStartPoint.current); setCustomObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, x: o.x + delta.x, z: o.z + delta.z } : o)); dragStartPoint.current = e.point.clone(); } else if (isDrawing) { const s = dragStartPoint.current; const end = e.point; const mid = new Vector3().addVectors(s, end).multiplyScalar(0.5); const dist = s.distanceTo(end); const angle = Math.atan2(end.x - s.x, end.z - s.z); let w = 1, l = Math.max(0.1, dist); if (selectedTool === 'PATH') { w = 2.8; if (selectedPathShape === 'CORNER') l = w; else if (selectedPathShape === 'CURVED') l = 6; } else if (selectedTool === 'COLOR_LINE') w = 2.8; else if (selectedTool === 'WALL') w = 0.5; else if (selectedTool === 'RAMP') w = 4; setPreviewObject({ id: 'temp', type: selectedTool, shape: selectedTool === 'PATH' ? selectedPathShape : undefined, x: mid.x, z: mid.z, width: w, length: l, rotation: angle, height: selectedTool === 'RAMP' ? 1.2 : undefined, color: selectedTool === 'PATH' ? '#FFFF00' : (selectedTool === 'COLOR_LINE' ? '#FF0000' : '#ef4444') }); } };
  const handleEditorPointerUp = () => { if (isDrawing && previewObject) setCustomObjects(prev => [...prev, { ...previewObject, id: `obj_${Date.now()}` }]); if (isDraggingObject && (isManualPlacementMode || selectedTool === 'ROBOT_MOVE')) { setCustomStartPosition({ x: robotState.x, z: robotState.z, rotation: robotState.rotation }); showToast("נקודת התחלה עודכנה!", "info"); } setIsDrawing(false); setIsDraggingObject(false); dragStartPoint.current = null; setPreviewObject(null); };

  return (
    <div className="flex flex-col h-screen overflow-hidden" dir="ltr">
      {toast && (<div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[500000] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 border-2 ${toast.type === 'success' ? 'bg-green-600 border-green-400 text-white' : toast.type === 'error' ? 'bg-red-600 border-red-400 text-white' : 'bg-blue-600 border-blue-400 text-white'}`}>{toast.type === 'success' ? <Check size={20} /> : toast.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}<span className="font-bold text-sm" dir="rtl">{toast.message}</span></div>)}
      <header className="bg-slate-800 text-white p-3 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-3"><Code2 className="w-6 h-6 text-blue-400" /><h1 className="text-lg font-bold hidden sm:block">Virtual Robotics Lab</h1></div>
        <div className="flex gap-2 bg-slate-700/50 p-1.5 rounded-xl border border-slate-600">
            <button onClick={handleRun} disabled={isRunning || startBlockCount === 0} className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold transition-all transform active:translate-y-[2px] ${isRunning || startBlockCount === 0 ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_2px_0_0_rgba(21,128,61,1)] active:shadow-none'}`}><Flag size={20} fill={(isRunning || startBlockCount === 0) ? "none" : "currentColor"} /></button>
            <button onClick={handleReset} className="flex items-center justify-center w-10 h-10 bg-red-600 hover:bg-red-50 text-white rounded-lg font-bold shadow-[0_2px_0_0_rgba(185,28,28,1)] active:shadow-none active:translate-y-[2px] transition-all transform"><RotateCcw size={20} /></button>
            <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
            <button onClick={() => setIsRulerActive(!isRulerActive)} className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold transition-all transform active:translate-y-[2px] ${isRulerActive ? 'bg-blue-600 text-white shadow-[0_2px_0_0_rgba(30,58,138,1)]' : 'bg-slate-600 text-slate-300 hover:bg-slate-500 active:shadow-none'}`}><Ruler size={20} /></button>
            <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
            <button onClick={() => setProjectModal({ isOpen: true, mode: 'save' })} className="flex items-center justify-center w-10 h-10 bg-slate-600 text-slate-300 hover:bg-slate-500 rounded-lg font-bold transition-all transform active:translate-y-[2px]"><Save size={20} /></button>
            <button onClick={() => setProjectModal({ isOpen: true, mode: 'load' })} className="flex items-center justify-center w-10 h-10 bg-slate-600 text-slate-300 hover:bg-slate-500 rounded-lg font-bold transition-all transform active:translate-y-[2px]"><FolderOpen size={20} /></button>
            <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
            <button onClick={handleShowPython} className="flex items-center justify-center w-10 h-10 bg-slate-600 text-slate-300 hover:bg-blue-500 hover:text-white rounded-lg font-bold transition-all transform active:translate-y-[2px]"><Terminal size={20} /></button>
            <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
            <div className="flex gap-1">
                <button onClick={() => setIsAdminModalOpen(true)} className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold transition-all transform active:translate-y-[2px] ${isAdmin ? 'bg-purple-600 text-white shadow-[0_2px_0_0_rgba(88,28,135,1)]' : 'bg-slate-600 text-slate-400 hover:bg-slate-500'}`}><Settings size={20} /></button>
                {isAdmin && (<button onClick={handleAdminLogout} className="flex items-center justify-center w-10 h-10 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-[0_2px_0_0_rgba(185,28,28,1)] active:shadow-none active:translate-y-[2px] transition-all transform"><LogOut size={20} /></button>)}
            </div>
        </div>
        <div className="flex items-center gap-2">{challengeSuccess && (<div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-lg animate-bounce shadow-lg"><Trophy size={16} /><span className="font-bold text-xs" dir="rtl">המשימה הושלמה!</span></div>)}<button onClick={() => { setShowChallenges(true); setCustomStartPosition(null); }} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all active:translate-y-[2px] ${activeChallenge ? 'bg-yellow-500 text-black' : 'bg-slate-600 text-white hover:bg-slate-500'}`}><Trophy size={16} /> {activeChallenge ? activeChallenge.title : "Challenges"}</button></div>
      </header>
      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-1/2 relative flex flex-col bg-white text-left text-sm">
            <div className="bg-slate-50 border-b p-2 flex justify-between items-center" dir="rtl"><div className="flex items-center gap-2"><Code2 size={18} className="text-slate-400" /><span className="font-bold text-slate-600">סביבת תכנות</span></div>{isAdmin && <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase">Admin Mode</span>}</div>
            <div className="flex-1 relative"><BlocklyEditor ref={blocklyEditorRef} onCodeChange={useCallback((code, count) => { setGeneratedCode(code); setStartBlockCount(count); }, [])} visibleVariables={visibleVariables} onToggleVariable={useCallback((n) => setVisibleVariables(v => { const next = new Set(v); if (next.has(n)) next.delete(n); else next.add(n); return next; }), [])} onVariablesChanged={handleVariablesChanged}/></div>
        </div>
        <div className="w-1/2 relative bg-gray-900" style={{ cursor: isColorPickerActive ? DROPPER_CURSOR_URL : (isDrawing || isManualPlacementMode) ? 'crosshair' : isDraggingObject ? 'grabbing' : selectedTool === 'PAN' ? 'grab' : 'auto' }}>
            {visibleVariables.size > 0 && (<div className="absolute top-20 left-4 z-[50] flex flex-col gap-2" dir="rtl">{Array.from(visibleVariables).map(varName => (<div key={varName} className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-orange-200 px-4 py-2 flex items-center gap-4 min-w-[120px]"><span className="text-orange-600 font-bold text-sm">{varName}:</span><span className="text-slate-800 font-mono font-bold text-lg">{monitoredValues[varName] ?? 0}</span></div>))}</div>)}
            <SensorDashboard distance={sensorReadings.distance} isTouching={robotState.isTouching} gyroAngle={sensorReadings.gyro} tiltAngle={sensorReadings.tilt} detectedColor={sensorReadings.color} lightIntensity={sensorReadings.intensity} overrideColor={isColorPickerActive ? pickerHoverColor : null} onColorClick={() => setIsColorPickerActive(!isColorPickerActive)} />
            <ChallengeBuilderUI isVisible={isEditorMode} selectedTool={selectedTool} onSelectTool={setSelectedTool} selectedPathShape={selectedPathShape} onSelectPathShape={setSelectedPathShape} selectedObjectId={selectedObjectId} onDeselect={() => setSelectedObjectId(null)} customObjects={customObjects} onPropertyChange={handlePropertyChange} onClose={() => { setIsEditorMode(false); setSelectedTool('NONE'); setSelectedObjectId(null); setEditingChallengeId(null); }} onSaveChallenge={handleSaveChallenge} onImportChallenge={handleImportChallenge} onOpenNumpad={(v, cb) => setNumpadConfig({ isOpen: true, value: v, onConfirm: cb })} onUndo={() => setCustomObjects(prev => prev.slice(0, -1))} onClearAll={() => { if(confirm("למחוק הכל?")) { setCustomObjects([]); setSelectedObjectId(null); } }} editingChallengeId={editingChallengeId} currentChallengeData={activeChallenge ? { title: activeChallenge.title, description: activeChallenge.description } : undefined} robotPos={{x: robotState.x, z: robotState.z, rotation: robotState.rotation}} />
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2"><div className="flex flex-col bg-white/95 rounded-xl shadow-xl border-2 border-slate-200 overflow-hidden"><button onClick={() => { setCameraMode('HOME'); setCameraResetKey(k => k + 1); }} className={`p-2.5 ${cameraMode === 'HOME' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}><Home size={22} /></button><button onClick={() => setCameraMode('TOP')} className={`p-2.5 ${cameraMode === 'TOP' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}><Eye size={22} /></button><button onClick={() => setCameraMode('FOLLOW')} className={`p-2.5 ${cameraMode === 'FOLLOW' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}><Move size={22} /></button><div className="h-px bg-slate-100 mx-1.5" /><button onClick={() => setSelectedTool(selectedTool === 'PAN' ? 'NONE' : 'PAN')} className={`p-2.5 transition-colors ${selectedTool === 'PAN' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}><Hand size={22} /></button><button onClick={() => setIsManualPlacementMode(!isManualPlacementMode)} className={`p-2.5 transition-colors ${isManualPlacementMode ? 'text-pink-600 bg-pink-50' : 'text-slate-500'}`}><Bot size={22} /></button></div><div className="flex flex-col bg-white/95 rounded-xl shadow-xl border-2 border-slate-200 overflow-hidden"><button onClick={() => triggerZoom('in')} className="p-2.5 text-slate-500 border-b"><ZoomIn size={22} /></button><button onClick={() => triggerZoom('out')} className="p-2.5 text-slate-500 border-b"><ZoomOut size={22} /></button><button onClick={() => setCameraResetKey(k => k + 1)} className="p-2.5 text-slate-500"><Maximize size={22} /></button></div></div>
            <Canvas shadows camera={{ position: [5, 8, 8], fov: 45 }}>
              <SimulationEnvironment challengeId={activeChallenge?.id} customObjects={useMemo(() => previewObject ? [...customObjects, { ...previewObject, opacity: 0.5 }] : customObjects, [customObjects, previewObject])} selectedObjectId={selectedObjectId} onObjectSelect={(id) => { if (isAdmin) { setSelectedObjectId(id); setIsEditorMode(true); } }} onPointerDown={handleEditorPointerDown} onPointerMove={handleEditorPointerMove} onPointerUp={handleEditorPointerUp} robotState={robotState} />
              {drawings.map((seg, i) => ( <Line key={i} points={[seg.start, seg.end]} color={seg.color} lineWidth={4} /> ))}
              <Robot3D state={robotState} isPlacementMode={selectedTool === 'ROBOT_MOVE' || isManualPlacementMode} />
              <CameraFollower targetX={robotState.x} targetY={robotState.y} targetZ={robotState.z} mode={cameraMode} resetKey={cameraResetKey} zoomKey={zoomKey} zoomDirection={zoomDirection} controlsRef={controlsRef} />
              <OrbitControls ref={controlsRef} makeDefault minDistance={1.2} maxDistance={60} enabled={(!isEditorMode || selectedTool === 'NONE' || selectedTool === 'ROTATE' || selectedTool === 'PAN' || selectedTool === 'ROBOT_MOVE') && !isDrawing && !isDraggingObject && !isManualPlacementMode} screenSpacePanning mouseButtons={{ LEFT: selectedTool === 'PAN' ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} />
              {isRulerActive && <RulerTool />}{isColorPickerActive && <ColorPickerTool onColorHover={setPickerHoverColor} onColorSelect={(hex) => { if (colorPickerCallbackRef.current) colorPickerCallbackRef.current(hex); setIsColorPickerActive(false); setPickerHoverColor(null); }} />}
            </Canvas>
        </div>
        <ProjectModal isOpen={projectModal.isOpen} mode={projectModal.mode} onClose={() => setProjectModal(p => ({ ...p, isOpen: false }))} onSaveToFile={(n) => { const blocklyXml = blocklyEditorRef.current?.saveWorkspace(); const blob = new Blob([JSON.stringify({ name: n, blocklyXml, customObjects, activeChallengeId: activeChallenge?.id })], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${n}.robocode`; link.click(); setProjectModal(p => ({ ...p, isOpen: false })); }} onLoad={(d) => { try { const data = JSON.parse(d); if (data.blocklyXml) blocklyEditorRef.current?.loadWorkspace(data.blocklyXml); if (data.customObjects) setCustomObjects(data.customObjects); if (data.activeChallengeId) { const c = [...currentBuiltInChallenges, ...userChallenges, ...teacherChallenges].find(x => x.id === data.activeChallengeId); if (c) setActiveChallenge(c); } } catch (e) { blocklyEditorRef.current?.loadWorkspace(d); } }} /><PythonCodeModal isOpen={isPythonModalOpen} code={pythonCode} onClose={() => setIsPythonModalOpen(false)} onCopy={() => { navigator.clipboard.writeText(pythonCode).then(() => showToast("קוד פייתון הועתק!", 'success')); }} /><ImportChallengeModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportChallenge} /><AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} onLogin={handleAdminLogin} onLogout={handleAdminLogout} isAdmin={isAdmin} />
        {showChallenges && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-8" dir="rtl">
                <div className="bg-slate-50 rounded-[2.5rem] w-full max-w-5xl h-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-8 border-white animate-in zoom-in duration-300">
                    <div className="px-8 py-6 bg-white border-b-2 border-slate-100 flex justify-between items-center shrink-0"><div className="flex flex-col"><h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Trophy className="text-yellow-500 w-10 h-10" /> אתגרים</h1><p className="text-slate-500 font-bold text-sm mr-1">בחר משימה להתחלת התרגול</p></div><div className="flex items-center gap-3">{isAdmin && (<button onClick={() => { const data = JSON.stringify({ teacher: teacherChallenges, overrides: overriddenBuiltInChallenges }, null, 2); navigator.clipboard.writeText(data).then(() => { showToast("קוד מורה הועתק!", "success"); const blob = new Blob([data], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "teacher_package.json"; link.click(); }); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95"><Download size={20} /> ייצוא קוד מורה</button>)}
                    {isAdmin && (<button onClick={() => { setIsEditorMode(true); setShowChallenges(false); setSelectedTool('ROTATE'); setIsManualPlacementMode(false); }} className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95"><Hammer size={20} /> בונה האתגרים</button>)}
                    <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-50 text-white rounded-2xl font-bold transition-all active:scale-95"><Upload size={20} /> ייבוא</button><div className="w-px h-10 bg-slate-200 mx-2" /><button onClick={() => setShowChallenges(false)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-500 transition-all"><X size={28} strokeWidth={3} /></button></div></div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-10">
                        <section className="bg-blue-50/50 p-8 rounded-[2rem] border-2 border-blue-100">
                            <h2 className="text-2xl font-black text-blue-800 flex items-center gap-3 mb-8"><Star className="fill-blue-500 text-blue-500" /> אתגרי המעבדה</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {currentBuiltInChallenges.map((c, i) => (<ChallengeCard key={c.id} challenge={c} isAdmin={isAdmin} activeChallenge={activeChallenge} onSelect={(c: any) => { setActiveChallenge(c); setShowChallenges(false); }} onEdit={(c: any) => { setActiveChallenge(c); setCustomObjects(c.environmentObjects || []); setEditingChallengeId(c.id); setIsEditorMode(true); setShowChallenges(false); }} onRevert={(id: string) => { setOverriddenBuiltInChallenges(prev => prev.filter(x => x.id !== id)); localStorage.setItem('builtin_overrides', JSON.stringify(overriddenBuiltInChallenges.filter(x => x.id !== id))); showToast("שוחזר!", "info"); }} onToggleHide={(id: string) => { const next = deletedBuiltInIds.includes(id) ? deletedBuiltInIds.filter(x => x !== id) : [...deletedBuiltInIds, id]; setDeletedBuiltInIds(next); localStorage.setItem('deleted_builtin_ids', JSON.stringify(next)); }} deletedBuiltInIds={deletedBuiltInIds} />))}
                            </div>
                        </section>
                        {teacherChallenges.length > 0 && (<section className="bg-purple-900 p-8 rounded-[2rem] border-4 border-amber-400 relative overflow-hidden"><h2 className="text-3xl font-black text-amber-400 flex items-center gap-3 mb-6 relative z-10"><Crown className="w-10 h-10" /> משימות מהמורה</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">{teacherChallenges.map((c) => (<div key={c.id} className="relative group"><button onClick={() => { setActiveChallenge(c); setShowChallenges(false); }} className={`w-full text-right p-6 rounded-3xl border-4 transition-all hover:scale-[1.02] flex flex-col ${activeChallenge?.id === c.id ? 'border-amber-400 bg-white shadow-xl' : 'border-purple-800 bg-purple-800/50 text-white'}`}><h3 className={`text-xl font-bold mb-2 ${activeChallenge?.id === c.id ? 'text-slate-800' : 'text-amber-400'}`}>{c.title}</h3><p className="text-sm italic flex-1">{c.description}</p></button>{isAdmin && (<div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => { setActiveChallenge(c); setCustomObjects(c.environmentObjects || []); setEditingChallengeId(c.id); setIsEditorMode(true); setShowChallenges(false); }} className="p-2.5 bg-amber-400 text-purple-900 rounded-xl shadow-lg"><Edit3 size={16} /></button><button onClick={() => { if(confirm("למחוק?")) { setTeacherChallenges(prev => prev.filter(x => x.id !== c.id)); localStorage.setItem('teacher_challenges', JSON.stringify(teacherChallenges.filter(x => x.id !== c.id))); } }} className="p-2.5 bg-red-600 text-white rounded-xl shadow-lg"><Trash2 size={16} /></button></div>)}</div>))}</div></section>)}
                        {userChallenges.length > 0 && (<section className="bg-orange-50/50 p-8 rounded-[2rem] border-2 border-orange-100"><h2 className="text-2xl font-black text-orange-700 flex items-center gap-3 mb-6"><Star className="fill-orange-500 text-orange-500" /> המשימות שלי</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{userChallenges.map((c) => (<div key={c.id} className="relative group"><button onClick={() => { setActiveChallenge(c); setShowChallenges(false); }} className={`w-full text-right p-6 rounded-3xl border-4 transition-all hover:translate-y-[-4px] flex flex-col ${activeChallenge?.id === c.id ? 'border-orange-500 bg-white shadow-xl' : 'border-white bg-white/80 shadow-sm'}`}><h3 className="text-xl font-bold text-slate-800 mb-2">{c.title}</h3><p className="text-slate-600 text-sm italic">{c.description}</p></button><div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { navigator.clipboard.writeText(JSON.stringify(c)).then(() => showToast("קוד הועתק!", 'info')); }} className="p-2.5 bg-white text-blue-600 rounded-xl shadow-lg border border-blue-50"><Copy size={16} /></button><button onClick={() => { setActiveChallenge(c); setCustomObjects(c.environmentObjects || []); setEditingChallengeId(c.id); setIsEditorMode(true); setShowChallenges(false); }} className="p-2.5 bg-white text-orange-600 rounded-xl shadow-lg border border-orange-50"><Edit3 size={16} /></button><button onClick={() => { if(confirm("למחוק?")) { setUserChallenges(prev => prev.filter(x => x.id !== c.id)); localStorage.setItem('user_challenges', JSON.stringify(userChallenges.filter(x => x.id !== c.id))); } }} className="p-2.5 bg-white text-red-600 rounded-xl shadow-lg border border-red-50"><Trash size={16} /></button></div></div>))}</div></section>)}
                    </div>
                </div>
            </div>
        )}
      </div>
      <Numpad isOpen={numpadConfig.isOpen} initialValue={numpadConfig.value} onConfirm={numpadConfig.onConfirm} onClose={() => setNumpadConfig(p => ({ ...p, isOpen: false }))} />
    </div>
  );
};

const ChallengeCard = ({ challenge, isAdmin, activeChallenge, onSelect, onEdit, onRevert, onToggleHide, deletedBuiltInIds }: any) => {
    const isDeleted = deletedBuiltInIds.includes(challenge.id); if (isDeleted && !isAdmin) return null;
    return (
        <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button onClick={() => onSelect(challenge)} className={`text-right p-6 rounded-3xl border-4 transition-all hover:translate-y-[-4px] flex flex-col h-full w-full ${isDeleted ? 'opacity-40 grayscale' : ''} ${activeChallenge?.id === challenge.id ? 'border-blue-500 bg-white shadow-xl' : (challenge.isOverridden ? 'border-orange-300 bg-orange-50/30' : 'border-white bg-white/80 shadow-sm')}`}>
                <div className="flex justify-between items-start mb-3 gap-4"><h3 className="text-lg font-bold text-slate-800 leading-tight">{challenge.title}</h3><div className="flex flex-col items-end gap-1"><span className={`shrink-0 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase ${challenge.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : challenge.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{challenge.difficulty === 'Easy' ? 'קל' : challenge.difficulty === 'Medium' ? 'בינוני' : 'קשה'}</span>{challenge.isOverridden && (<span className="bg-orange-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black">עודכן ע"י מורה</span>)}</div></div>
                <p className="text-slate-500 text-sm leading-relaxed flex-1">{challenge.description}</p>
                <div className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-xs uppercase"><PlayCircle size={14} /> התחל אתגר</div>
            </button>
            {isAdmin && (<div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={(e) => { e.stopPropagation(); onEdit(challenge); }} className="p-2 bg-blue-600 text-white rounded-lg shadow-lg"><Edit3 size={14} /></button>{challenge.isOverridden && (<button onClick={(e) => { e.stopPropagation(); if(confirm("לשחזר?")) onRevert(challenge.id); }} className="p-2 bg-orange-500 text-white rounded-lg shadow-lg"><RefreshCcw size={14} /></button>)}<button onClick={(e) => { e.stopPropagation(); onToggleHide(challenge.id); }} className={`p-2 rounded-lg shadow-lg ${isDeleted ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>{isDeleted ? <Eye size={14} /> : <EyeOff size={14} />}</button></div>)}
        </div>
    );
};

export default App;
