  import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCcw, Code2, Ruler, Trophy, X, Flag, Save, FolderOpen, Check, AlertCircle, Info, Terminal, Star, Home, Eye, Move, Hand, Bot, Target, FileCode, ZoomIn, ZoomOut } from 'lucide-react';

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

const DROPPER_CURSOR_URL = `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwNC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmb25lIiBzZmlsbC1vcGFjaXR5PSIxIiBzdHJva2U9IiNlYzQ4OTkiIHN0cm9rZS13aWR0aD0iMiIgc3RyYtBLLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtdW5lam9pbj0icm91bmQiPjxwYXRoIGQ9MTAuNTQgOC40NmE1IDUgMCAxIDAtNy4wNyA3LjA3bDEuNDEgMS40MWEyIDIgMCAwIDAgMi44MyAwbDIuODMtMi44M2EyIDIgMCAwIDAgMC0yLjgzbC0xLjQxLTEuNDF6Ii8+PHBhdGggZD0ibTkgMTkgNW0tNy05IDUtNSIvPjxwYXRoIGQ9Ik05LjUgMTQuNSA0IDkiLz48cGF0aCBkPSJtMTggNiAzLTMiLz48cGF0aCBkPSJNMjAuOSA3LjFhMiAyIDAg5IDAtMi44LTy44bC0xLjQgMS40IDIuOCAy.4IDEuNC0x.4eiIvPjwvc3ZnPgo=') 0 24, crosshair`;

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

const normalizeAngle = (angle: number) => (angle % 360 + 360) % 360;

const getAngleDifference = (angle1: number, angle2: number) => {
    let diff = normalizeAngle(angle1 - angle2);
    if (diff > 180) diff -= 360;
    return diff;
};

const isColorClose = (hex1: string, hex2: string, threshold = 0.2) => {
    try {
        if (!hex1 || !hex2) return false;
        const h1 = hex1.toLowerCase();
        const h2 = hex2.toLowerCase();
        if (h1 === h2) return true;

        const finalH1 = CANONICAL_COLOR_MAP[h1] || (h1.startsWith('#') ? h1 : '#' + h1);
        const finalH2 = CANONICAL_COLOR_MAP[h2] || (h2.startsWith('#') ? h2 : '#' + h2);

        if (!finalH1 || !finalH2) {
            try { new THREE.Color(finalH1); } catch { return false; }
            try { new THREE.Color(finalH2); } catch { return false; }
        }

        const c1 = new THREE.Color(finalH1);
        const c2 = new THREE.Color(finalH2);
        const dr = c1.r - c2.r;
        const dg = c1.g - c2.g;
        const db = c1.b - c2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db) < threshold;
    } catch (e) {
        console.error("Error in isColorClose:", e);
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

const isPointInObject = (px: number, pz: number, obj: CustomObject) => {
    const { lx, lz } = getLocalCoords(px, pz, obj.x, obj.z, obj.rotation || 0);
    const halfW = obj.width / 2;
    const halfL = (obj.type === 'PATH' && obj.shape === 'CORNER') ? obj.width / 2 : obj.length / 2;
    return Math.abs(lx) <= halfW && Math.abs(lz) <= halfL;
};

const isPointInObjectWithTolerance = (px: number, pz: number, obj: CustomObject, tolerance: number) => {
    const { lx, lz } = getLocalCoords(px, pz, obj.x, obj.z, obj.rotation || 0);
    const halfW = obj.width / 2;
    const halfL = (obj.type === 'PATH' && obj.shape === 'CORNER') ? obj.width / 2 : obj.length / 2;
    return Math.abs(lx) <= (halfW + tolerance) && Math.abs(lz) <= (halfL + tolerance);
};

const getEnvironmentConfig = (challengeId?: string, customObjects: CustomObject[] = []) => {
    let walls: { minX: number, maxX: number, minZ: number, maxZ: number }[] = [];
    let complexZones: { x: number, z: number, width: number, length: number, rotation: number, color: number, shape?: PathShape, type: EditorTool }[] = [];
    if (['c10', 'c16', 'c19', 'c20'].includes(challengeId || '')) walls.push({ minX: -3, maxX: 3, minZ: -10.25, maxZ: -9.75 });
    customObjects.forEach(obj => {
        if (obj.type === 'WALL') { const hW = obj.width / 2; const hL = obj.length / 2; walls.push({ minX: obj.x - hW, maxX: obj.x + hW, minZ: obj.z - hL, maxZ: obj.z + hL }); }
        else if (obj.type === 'PATH') { const lineHex = obj.color || '#FFFF00'; const colorVal = parseInt(lineHex.replace('#', '0x'), 16); complexZones.push({ x: obj.x, z: obj.z, width: obj.width, length: obj.length, rotation: obj.rotation || 0, color: colorVal, shape: obj.shape || 'STRAIGHT', type: obj.type }); }
        else if (obj.type === 'COLOR_LINE') { const hC = obj.color || '#FF0000'; complexZones.push({ x: obj.x, z: obj.z, width: obj.width, length: obj.length, rotation: obj.rotation || 0, color: parseInt(hC.replace('#', '0x'), 16), type: obj.type }); }
        else if (obj.type === 'RAMP') {
            const rampHex = obj.color || '#334155';
            const colorVal = parseInt(rampHex.replace('#', '0x'), 16);
            complexZones.push({ x: obj.x, z: obj.z, width: obj.width, length: obj.length, rotation: obj.rotation || 0, color: colorVal, type: obj.type });
        }
    });
    return { walls, complexZones };
};

const getSurfaceHeightAt = (qx: number, qz: number, challengeId?: string, customObjects: CustomObject[] = []) => {
    let maxHeight = 0;
    for (const obj of customObjects) {
        if (obj.type === 'RAMP') {
            const { lx, lz } = getLocalCoords(qx, qz, obj.x, obj.z, obj.rotation || 0);
            const hW = obj.width / 2;
            const hL = obj.length / 2;
            const h = obj.height || 1.0;
            if (Math.abs(lx) <= hW && Math.abs(lz) <= hL) {
                const section = obj.length / 3;
                const uphillEnd = -hL + section;
                const downhillStart = hL - section;
                let currentY = 0;
                if (lz < uphillEnd) {
                    const t = (lz - (-hL)) / section;
                    currentY = t * h;
                } else if (lz < downhillStart) {
                    currentY = h;
                } else {
                    const t = (lz - downhillStart) / section;
                    currentY = h - (t * h);
                }
                maxHeight = Math.max(maxHeight, currentY);
            }
        }
    }
    if (challengeId === 'c18') {
        if (qx >= -2.1 && qx <= 2.1) {
            if (qz < -0.2 && qz > -3.7) maxHeight = Math.max(maxHeight, ((qz - (-0.2)) / -3.5) * 1.73);
            else if (qz <= -3.7 && qz >= -7.4) maxHeight = Math.max(maxHeight, 1.73);
            else if (qz < -7.4 && qz > -10.9) maxHeight = Math.max(maxHeight, 1.73 - (((qz - (-7.4)) / -3.5) * 1.73));
        }
    }
    return maxHeight;
};

const checkTouchSensorHit = (x: number, z: number, rotation: number, walls: { minX: number, maxX: number, minZ: number, maxZ: number }[]) => {
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const sensorTipX = x + sin * 1.7;
    const sensorTipZ = z + cos * 1.7;

    for (const w of walls) {
        if (sensorTipX >= w.minX && sensorTipX <= w.maxX && sensorTipZ >= w.minZ && sensorTipZ <= w.maxZ) return true;
    }
    return false;
};

const checkPhysicsHit = (px: number, pz: number, walls: { minX: number, maxX: number, minZ: number, maxZ: number }[]) => {
    for (const w of walls) {
        if (px >= w.minX && px <= w.maxX && pz >= w.minZ && pz <= w.maxZ) return true;
    }
    return false;
};

const calculateSensorReadings = (x: number, z: number, rotation: number, challengeId?: string, customObjects: CustomObject[] = []) => {
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const env = getEnvironmentConfig(challengeId, customObjects);
    const gyro = Math.round(normalizeAngle(rotation));

    const getPointWorldPos = (lx: number, lz: number) => ({
        wx: x + (lx * Math.cos(rad) + lz * Math.sin(rad)),
        wz: z + (-lx * Math.sin(rad) + lz * Math.cos(rad))
    });

    const wheelOffsetZ = 0.5;
    const wheelOffsetX = 0.95;
    const casterOffsetZ = -0.8;
    const frontSensorPos = getPointWorldPos(0, 1.1);

    const leftWheelPos = getPointWorldPos(-wheelOffsetX, wheelOffsetZ);
    const rightWheelPos = getPointWorldPos(wheelOffsetX, wheelOffsetZ);
    const backCasterPos = getPointWorldPos(0, casterOffsetZ);

    const hLeft = getSurfaceHeightAt(leftWheelPos.wx, leftWheelPos.wz, challengeId, customObjects);
    const hRight = getSurfaceHeightAt(rightWheelPos.wx, rightWheelPos.wz, challengeId, customObjects);
    const hBack = getSurfaceHeightAt(backCasterPos.wx, backCasterPos.wz, challengeId, customObjects);
    const hFront = getSurfaceHeightAt(frontSensorPos.wx, frontSensorPos.wz, challengeId, customObjects);

    const y = (hLeft + hRight + hBack) / 3;

    const frontAvg = (hLeft + hRight) / 2;
    const tilt = Math.atan2(frontAvg - hBack, 1.3) * (180 / Math.PI);
    const roll = Math.atan2(hLeft - hRight, wheelOffsetX * 2) * (180 / Math.PI);

    const cx = x + sin * 0.9;
    const cz = z + cos * 0.9;
    let sensorDetectedColor = "white";
    let sensorIntensity = 100;
    let sensorRawDecimalColor = 0xFFFFFF;

    for (const zZone of env.complexZones) {
        const dx = cx - zZone.x;
        const dz = cz - zZone.z;
        const cR = Math.cos(-zZone.rotation);
        const sR = Math.sin(-zZone.rotation);
        const lX = dx * cR - dz * sR;
        const lZ = dx * sR + dz * cR;
        let onZone = false;

        const xTolerance = zZone.width / 2 + 0.1;
        const zTolerance = zZone.length / 2 + 0.1;

        if (zZone.type === 'RAMP') {
            const hW_ramp = zZone.width / 2;
            const hL_ramp = zZone.length / 2;
            if (Math.abs(lX) <= (hW_ramp + 0.1) && Math.abs(lZ) <= (hL_ramp + 0.1)) {
                onZone = true;
            }
        }
        else if (zZone.shape === 'STRAIGHT' || !zZone.shape) {
            if (Math.abs(lX) <= xTolerance && Math.abs(lZ) <= zTolerance) onZone = true;
        } else if (zZone.shape === 'CORNER') {
            const halfCornerWidth = zZone.width / 2;
            if (
                (Math.abs(lX) <= (xTolerance) && lZ >= -0.1 && lZ <= (halfCornerWidth + 0.1)) ||
                (Math.abs(lZ) <= (zTolerance) && lX >= -0.1 && lX <= (halfCornerWidth + 0.1))
            ) {
                onZone = true;
            }
        } else if (zZone.shape === 'CURVED') {
            const midRadius = zZone.length / 2;
            const shiftedLX = lX + midRadius;
            const distFromArcCenter = Math.sqrt(Math.pow(shiftedLX, 2) + Math.pow(lZ, 2));
            const angle = Math.atan2(lZ, shiftedLX);

            const halfPathWidth = zZone.width / 2;
            if (
                Math.abs(distFromArcCenter - midRadius) <= (halfPathWidth + 0.1) &&
                angle >= -0.1 && angle <= Math.PI / 2 + 0.1
            ) {
                onZone = true;
            }
        }

        if (onZone) {
            sensorRawDecimalColor = zZone.color;
            const hexStr = "#" + sensorRawDecimalColor.toString(16).padStart(6, '0').toUpperCase();

            console.log(`Sensor: Raw detected HEX: ${hexStr} (from object type: ${zZone.type}, shape: ${zZone.shape})`);

            if (isColorClose(hexStr, CANONICAL_COLOR_MAP['red'])) { console.log(`Sensor: Matched RED`); sensorDetectedColor = "red"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['blue'])) { console.log(`Sensor: Matched BLUE`); sensorDetectedColor = "blue"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['green'])) { console.log(`Sensor: Matched GREEN`); sensorDetectedColor = "green"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['yellow'])) { console.log(`Sensor: Matched YELLOW`); sensorDetectedColor = "yellow"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['orange'])) { console.log(`Sensor: Matched ORANGE`); sensorDetectedColor = "orange"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['purple'])) { console.log(`Sensor: Matched PURPLE`); sensorDetectedColor = "purple"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['cyan'])) { console.log(`Sensor: Matched CYAN`); sensorDetectedColor = "cyan"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['magenta'])) { console.log(`Sensor: Matched MAGENTA`); sensorDetectedColor = "magenta"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['black'])) { console.log(`Sensor: Matched BLACK`); sensorDetectedColor = "black"; }
            else if (isColorClose(hexStr, CANONICAL_COLOR_MAP['white'])) { console.log(`Sensor: Matched WHITE`); sensorDetectedColor = "white"; }
            else {
                sensorDetectedColor = hexStr;
                console.log(`Sensor: No canonical match, using raw HEX: ${hexStr}`);
            }

            break;
        }
    }

    if (sensorDetectedColor === "white") {
        if (challengeId === 'c21') {
            const dist = Math.sqrt(Math.pow(cx - (-6), 2) + Math.pow(cz - 0, 2));
            if (Math.abs(dist - 6.0) <= 0.25) { sensorDetectedColor = "black"; sensorIntensity = 5; sensorRawDecimalColor = 0x000000; }
        } else if (challengeId === 'c12') {
            const ex = cx - 0; const ez = cz - (-8);
            const normDist = Math.sqrt(Math.pow(ex / 9, 2) + Math.pow(ez / 6, 2));
            if (Math.abs(normDist - 1.0) <= 0.04) {
                sensorDetectedColor = "black"; sensorIntensity = 5; sensorRawDecimalColor = 0x000000;
                const angle = Math.atan2(ez, ex);
                const deg = (angle * 180 / Math.PI + 360) % 360;
                const markerThreshold = 4.0;
                if (isColorClose(sensorDetectedColor, CANONICAL_COLOR_MAP['red'], 0.1) || Math.abs(deg - 0) < markerThreshold || Math.abs(deg - 360) < markerThreshold) { sensorDetectedColor = "red"; sensorIntensity = 40; sensorRawDecimalColor = 0xFF0000; }
                else if (isColorClose(sensorDetectedColor, CANONICAL_COLOR_MAP['blue'], 0.1) || Math.abs(deg - 90) < markerThreshold) { sensorDetectedColor = "blue"; sensorIntensity = 30; sensorRawDecimalColor = 0x0000FF; }
                else if (isColorClose(sensorDetectedColor, CANONICAL_COLOR_MAP['green'], 0.1) || Math.abs(deg - 180) < markerThreshold) { sensorDetectedColor = "green"; sensorIntensity = 50; sensorRawDecimalColor = 0x22C55E; }
                else if (isColorClose(sensorDetectedColor, CANONICAL_COLOR_MAP['yellow'], 0.1) || Math.abs(deg - 270) < markerThreshold) { sensorDetectedColor = "yellow"; sensorIntensity = 80; sensorRawDecimalColor = 0xFFFF00; }
            }
        } else if (challengeId === 'c10') {
            if (Math.abs(cx) <= 1.25 && cz <= 0 && cz >= -15) {
                sensorDetectedColor = "#64748b"; sensorIntensity = 40; sensorRawDecimalColor = 0x64748b;
            }
        } else if (challengeId === 'c18') {
            if (Math.abs(cx) <= 2.1 && cz <= -17.25 && cz >= -17.75) {
                sensorDetectedColor = "red"; sensorIntensity = 40; sensorRawDecimalColor = 0xFF0000;
            }
        } else if (challengeId === 'c15' || challengeId === 'c14') {
            if (Math.abs(cx) <= 1.5 && cz <= -9.5 && cz >= -12.5) { sensorDetectedColor = "blue"; sensorIntensity = 30; sensorRawDecimalColor = 0x0000FF; }
            else if (Math.abs(cx) <= 1.5 && cz <= -3.5 && cz >= -6.5) { sensorDetectedColor = "red"; sensorIntensity = 40; sensorRawDecimalColor = 0xFF0000; }
        }
    }

    const touchSensorPressed = checkTouchSensorHit(x, z, rotation, env.walls);

    const physicalHitForMovement = checkPhysicsHit(x + sin * 1.5, z + cos * 1.5, env.walls);

    let distance = 255;
    for (let d = 0; d < 40.0; d += 0.2) {
        if (checkPhysicsHit(x + sin * (1.7 + d), z + cos * (1.7 + d), env.walls)) {
            distance = Math.round(d * 10);
            break;
        }
    }

    return {
        gyro,
        tilt,
        roll,
        y,
        isTouching: touchSensorPressed,
        physicalHit: physicalHitForMovement,
        distance,
        color: sensorDetectedColor,
        intensity: sensorIntensity,
        rawDecimalColor: sensorRawDecimalColor,
        sensorX: cx,
        sensorZ: cz
    };
};

const App: React.FC = () => {
    const [generatedCode, setGeneratedCode] = useState<string>('');
    const [startBlockCount, setStartBlockCount] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isRulerActive, setIsRulerActive] = useState(false);
    const [isColorPickerActive, setIsColorPickerActive] = useState(false);
    const [customObjects, setCustomObjects] = useState<CustomObject[]>([]);
    const [cameraMode, setCameraMode] = useState<CameraMode>('HOME');
    const [editorTool, setEditorTool] = useState<EditorTool>('NONE');
    const [pickerHoverColor, setPickerHoverColor] = useState<string | null>(null);
    const [showChallenges, setShowChallenges] = useState(false);
    const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
    const [challengeSuccess, setChallengeSuccess] = useState(false);
    const [projectModal, setProjectModal] = useState<{ isOpen: boolean, mode: 'save' | 'load' }>({ isOpen: false, mode: 'save' });
    const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
    const [monitoredValues, setMonitoredValues] = useState<Record<string, any>>({});
    const [visibleVariables, setVisibleVariables] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

    // Ref for blockly color picker callback
    const blocklyColorPickCallbackRef = useRef<((color: string) => void) | null>(null);

    const blocklyEditorRef = useRef<BlocklyEditorHandle>(null);
    const controlsRef = useRef<any>(null);
    const historyRef = useRef<SimulationHistory>({ maxDistanceMoved: 0, touchedWall: false, detectedColors: [], totalRotation: 0 });
    const executionId = useRef(0);
    const [numpadConfig, setNumpadConfig] = useState({ isOpen: false, value: 0, onConfirm: (val: number) => { } });

    // Drawing state
    const [activeDrawing, setActiveDrawing] = useState<ContinuousDrawing | null>(null);
    const [completedDrawings, setCompletedDrawings] = useState<ContinuousDrawing[]>([]);
    const activeDrawingRef = useRef<ContinuousDrawing | null>(null);

    const robotRef = useRef<RobotState>({ x: 0, y: 0, z: 0, rotation: 180, tilt: 0, roll: 0, speed: 100, motorLeftSpeed: 0, motorRightSpeed: 0, ledLeftColor: 'black', ledRightColor: 'black', isMoving: false, isTouching: false, penDown: false, penColor: '#000000' });
    const [robotState, setRobotState] = useState<RobotState>(robotRef.current);
    const isPlacingRobot = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const listenersRef = useRef<{ messages: Record<string, (() => Promise<void>)[]>, colors: { color: string, cb: () => Promise<void>, lastMatch: boolean }[], obstacles: { cb: () => Promise<void>, lastMatch: boolean }[], distances: { threshold: number, cb: () => Promise<void>, lastMatch: boolean }[], variables: Record<string, any> }>({ messages: {}, colors: [], obstacles: [], distances: [], variables: {} });

    const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 4000); }, []);

    const handleReset = useCallback(() => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        executionId.current++;
        const envObjs = activeChallenge?.environmentObjects || [];
        setCustomObjects(envObjs);
        const startX = activeChallenge?.startPosition?.x ?? 0;
        const startZ = activeChallenge?.startPosition?.z ?? 0;
        const startRot = activeChallenge?.startRotation ?? 180;

        const sd_initial = calculateSensorReadings(startX, startZ, startRot, activeChallenge?.id, envObjs);
        const d = { ...robotRef.current, x: startX, y: sd_initial.y, z: startZ, rotation: startRot, motorLeftSpeed: 0, motorRightSpeed: 0, ledLeftColor: 'black', ledRightColor: 'black', tilt: sd_initial.tilt, roll: sd_initial.roll, penDown: false, isTouching: false };
        robotRef.current = d;
        setRobotState(d);
        setIsRunning(false);
        setChallengeSuccess(false);
        setMonitoredValues({});

        setCompletedDrawings([]);
        setActiveDrawing(null);
        activeDrawingRef.current = null;

        historyRef.current = { maxDistanceMoved: 0, touchedWall: false, detectedColors: [], totalRotation: 0 };
        listenersRef.current = { messages: {}, colors: [], obstacles: [], distances: [], variables: {} };
        if (controlsRef.current) { controlsRef.current.reset(); setCameraMode('HOME'); }
    }, [activeChallenge]);

    useEffect(() => { handleReset(); }, [activeChallenge, handleReset]);

    const handlePointerDown = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (isColorPickerActive) return;

        e.stopPropagation();
        if (editorTool === 'ROBOT_MOVE') {
            isPlacingRobot.current = true;
            const point = e.point;
            const sd = calculateSensorReadings(point.x, point.z, robotRef.current.rotation, activeChallenge?.id, customObjects);
            const next = { ...robotRef.current, x: point.x, z: point.z, y: sd.y, tilt: sd.tilt, roll: sd.roll };
            robotRef.current = next;
            setRobotState(next);
        }
    }, [editorTool, activeChallenge, customObjects, isColorPickerActive]);

    const handlePointerMove = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (isColorPickerActive) return;

        e.stopPropagation();
        if (isPlacingRobot.current && editorTool === 'ROBOT_MOVE') {
            const point = e.point;
            const sd = calculateSensorReadings(point.x, point.z, robotRef.current.rotation, activeChallenge?.id, customObjects);
            const next = { ...robotRef.current, x: point.x, z: point.z, y: sd.y, tilt: sd.tilt, roll: sd.roll };
            robotRef.current = next;
            setRobotState(next);
        }
    }, [editorTool, activeChallenge, customObjects, isColorPickerActive]);

    const handlePointerUp = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (isColorPickerActive) return;

        e.stopPropagation();
        isPlacingRobot.current = false;
    }, [isColorPickerActive]);

    const handleRun = useCallback(async () => {
        if (isRunning) return;
        setIsRunning(true);
        setChallengeSuccess(false);
        const currentRunId = ++executionId.current;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const checkAbort = () => { if (controller.signal.aborted || executionId.current !== currentRunId) throw new Error("Simulation aborted"); };

        const robotApi = {
            move: async (dist: number) => {
                checkAbort();
                const startX = robotRef.current.x; const startZ = robotRef.current.z;
                const targetDist = Math.abs(dist) * 0.1; const direction = dist > 0 ? 1 : -1;
                const power = 100 * direction;
                robotRef.current = { ...robotRef.current, motorLeftSpeed: power, motorRightSpeed: power };
                while (true) {
                    checkAbort();
                    const moved = Math.sqrt(Math.pow(robotRef.current.x - startX, 2) + Math.pow(robotRef.current.z - startZ, 2));
                    if (moved >= targetDist) break;
                    await new Promise(r => setTimeout(r, TICK_RATE));
                    const sd = calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects);
                    if (sd.isTouching) break;
                }
                robotRef.current = { ...robotRef.current, motorLeftSpeed: 0, motorRightSpeed: 0 };
            },
            turn: async (angle: number) => {
                checkAbort();
                const initialRotation = normalizeAngle(robotRef.current.rotation);
                const targetAbsoluteRotation = normalizeAngle(initialRotation + angle);

                const direction = angle > 0 ? 1 : -1;
                const power = 50 * direction;

                robotRef.current = { ...robotRef.current, motorLeftSpeed: -power, motorRightSpeed: power };

                while (true) {
                    checkAbort();
                    await new Promise(r => setTimeout(r, TICK_RATE));

                    const currentRotation = normalizeAngle(robotRef.current.rotation);
                    const diffToTarget = getAngleDifference(targetAbsoluteRotation, currentRotation);

                    if (direction > 0 && diffToTarget <= TURN_TOLERANCE) break;
                    if (direction < 0 && diffToTarget >= -TURN_TOLERANCE) break;
                }
                robotRef.current = { ...robotRef.current, motorLeftSpeed: 0, motorRightSpeed: 0 };
                robotRef.current.rotation = targetAbsoluteRotation;
                setRobotState({ ...robotRef.current });
            },
            setHeading: async (targetAngle: number) => {
                checkAbort();
                const currentRot = normalizeAngle(robotRef.current.rotation);
                const normalizedTarget = normalizeAngle(targetAngle);
                let diff = getAngleDifference(normalizedTarget, currentRot);

                await robotApi.turn(diff);
                checkAbort();
            },
            wait: (ms: number) => new Promise((resolve, reject) => { const t = setTimeout(resolve, ms); controller.signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error("Simulation aborted")); }, { once: true }); }),
            setMotorPower: async (left: number, right: number) => { checkAbort(); robotRef.current = { ...robotRef.current, motorLeftSpeed: left, motorRightSpeed: right }; },
            setSpeed: async (s: number) => { checkAbort(); robotRef.current.speed = s; },
            stop: async () => { checkAbort(); robotRef.current = { ...robotRef.current, motorLeftSpeed: 0, motorRightSpeed: 0 }; },
            setPen: async (down: boolean) => {
                checkAbort();
                robotRef.current.penDown = down;
                setRobotState(prev => ({ ...prev, penDown: down }));

                if (!down) {
                    if (activeDrawingRef.current) {
                        setCompletedDrawings(prev => [...prev, activeDrawingRef.current!]);
                        setActiveDrawing(null);
                        activeDrawingRef.current = null;
                    }
                }
            },
            setPenColor: async (color: string) => { checkAbort(); robotRef.current.penColor = color; setRobotState(prev => ({ ...prev, penColor: color })); },
            clearPen: async () => {
                checkAbort();
                setCompletedDrawings([]);
                setActiveDrawing(null);
                activeDrawingRef.current = null;
            },
            getDistance: async () => { checkAbort(); return calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects).distance; },
            getTouch: async () => { checkAbort(); return calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects).isTouching; },
            getGyro: async (mode: 'ANGLE' | 'TILT') => { checkAbort(); const sd = calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects); return mode === 'TILT' ? sd.tilt : sd.gyro; },
            getColor: async () => { checkAbort(); return calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects).color; },
            isTouchingColor: async (hex: string) => {
                checkAbort();
                const sd = calculateSensorReadings(robotRef.current.x, robotRef.current.z, robotRef.current.rotation, activeChallenge?.id, customObjects);
                let detectedColorToCompare = sd.color;
                return isColorClose(detectedColorToCompare, hex);
            },
            getCircumference: async () => 3.77,
            setLed: (side: 'left' | 'right' | 'both', color: string) => { checkAbort(); if (side === 'left' || side === 'both') robotRef.current.ledLeftColor = color; if (side === 'right' || side === 'both') robotRef.current.ledRightColor = color; setRobotState({ ...robotRef.current }); },
            onMessage: (msg: string, cb: () => Promise<void>) => { if (!listenersRef.current.messages[msg]) listenersRef.current.messages[msg] = []; listenersRef.current.messages[msg].push(cb); },
            sendMessage: async (msg: string) => { checkAbort(); if (listenersRef.current.messages[msg]) await Promise.all(listenersRef.current.messages[msg].map(cb => cb())); },
            onColor: (color: string, cb: () => Promise<void>) => { listenersRef.current.colors.push({ color, cb, lastMatch: false }); },
            onObstacle: (cb: () => Promise<void>) => { listenersRef.current.obstacles.push({ cb, lastMatch: false }); },
            onDistance: (threshold: number, cb: () => Promise<void>) => { listenersRef.current.distances.push({ threshold, cb, lastMatch: false }); },
            updateVariable: (name: string, val: any) => { setMonitoredValues(prev => ({ ...prev, [name]: val })); },
            stopProgram: async () => { controller.abort(); setIsRunning(false); }
        };
        try {
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            await new AsyncFunction('robot', generatedCode)(robotApi);
        } catch (e: any) {
            if (e.message !== "Simulation aborted") { console.error(e); setIsRunning(false); }
        }
    }, [isRunning, generatedCode, activeChallenge, customObjects]);

    useEffect(() => {
        let interval: any;
        if (isRunning) {
            interval = setInterval(() => {
                const current = robotRef.current;

                const f = current.speed / 100.0;
                const pL = current.motorLeftSpeed / 100.0;
                const pR = current.motorRightSpeed / 100.0;

                let fV_raw = ((pL + pR) / 2.0) * BASE_VELOCITY * f;
                const rV = (pR - pL) * BASE_TURN_SPEED * f;

                let fV_adjusted = fV_raw;
                const sd_current_for_tilt = calculateSensorReadings(current.x, current.z, current.rotation, activeChallenge?.id, customObjects);
                const currentTilt = sd_current_for_tilt.tilt;

                if (Math.abs(currentTilt) > 3) {
                    let tiltFactor = Math.abs(currentTilt) / 25;
                    tiltFactor = Math.min(tiltFactor, 1);

                    let reductionMultiplier = 1;

                    if (fV_raw > 0 && currentTilt > 0) {
                        reductionMultiplier = Math.max(0.2, 1 - tiltFactor * 0.8);
                    } else if (fV_raw < 0 && currentTilt < 0) {
                        reductionMultiplier = Math.max(0.2, 1 - tiltFactor * 0.8);
                    }
                    fV_adjusted = fV_raw * reductionMultiplier;
                }

                const nr_potential = current.rotation + rV;
                const nx_potential = current.x + Math.sin(nr_potential * Math.PI / 180) * fV_adjusted;
                const nz_potential = current.z + Math.cos(nr_potential * Math.PI / 180) * fV_adjusted;

                const sd_predicted = calculateSensorReadings(nx_potential, nz_potential, nr_potential, activeChallenge?.id, customObjects);

                const finalX = sd_predicted.isTouching ? current.x : nx_potential;
                const finalZ = sd_predicted.isTouching ? current.z : nz_potential;

                const next = {
                    ...current,
                    x: finalX,
                    z: finalZ,
                    y: current.y + (sd_predicted.y - current.y) * 0.3,
                    tilt: current.tilt + (sd_predicted.tilt - current.tilt) * 0.3,
                    roll: current.roll + (sd_predicted.roll - current.roll) * 0.3,
                    rotation: nr_potential,
                    isTouching: sd_predicted.isTouching,
                    isMoving: Math.abs(fV_adjusted) > 0.001 || Math.abs(rV) > 0.001,
                    sensorX: sd_predicted.sensorX,
                    sensorZ: sd_predicted.sensorZ,
                };
                robotRef.current = next;
                setRobotState(next);

                const curDetectedColor = sd_predicted.color;
                listenersRef.current.colors.forEach(l => {
                    const isMatch = isColorClose(curDetectedColor, l.color);
                    if (isMatch && !l.lastMatch) l.cb();
                    l.lastMatch = isMatch;
                });
                listenersRef.current.obstacles.forEach(l => {
                    const isMatch = sd_predicted.isTouching;
                    if (isMatch && !l.lastMatch) l.cb();
                    l.lastMatch = isMatch;
                });
                listenersRef.current.distances.forEach(l => {
                    const isMatch = sd_predicted.distance < l.threshold;
                    if (isMatch && !l.lastMatch) l.cb();
                    l.lastMatch = isMatch;
                });
                if (sd_predicted.isTouching) historyRef.current.touchedWall = true;

                const startX = activeChallenge?.startPosition?.x || 0;
                const startZ = activeChallenge?.startPosition?.z || 0;
                const distMoved = Math.sqrt(Math.pow(next.x - startX, 2) + Math.pow(next.z - startZ, 2));
                historyRef.current.maxDistanceMoved = Math.max(historyRef.current.maxDistanceMoved, distMoved * 10);
                if (!historyRef.current.detectedColors.includes(curDetectedColor)) historyRef.current.detectedColors.push(curDetectedColor);
                historyRef.current.totalRotation = robotRef.current.rotation - (activeChallenge?.startRotation ?? 180);

                if (next.penDown) {
                    const currPos: [number, number, number] = [next.x, next.y + 0.02, next.z];

                    setActiveDrawing(prevActiveDrawing => {
                        let drawingToModify = prevActiveDrawing;

                        if (!drawingToModify || drawingToModify.color !== next.penColor) {
                            if (drawingToModify) {
                                setCompletedDrawings(oldCompleted => [...oldCompleted, drawingToModify!]);
                            }
                            const newDrawing = { id: `path-${Date.now()}`, points: [currPos], color: next.penColor };
                            activeDrawingRef.current = newDrawing;
                            return newDrawing;
                        } else {
                            const hasMovedSignificantly = drawingToModify.points.length > 0 &&
                                (Math.pow(currPos[0] - drawingToModify.points[drawingToModify.points.length - 1][0], 2) +
                                    Math.pow(currPos[2] - drawingToModify.points[drawingToModify.points.length - 1][2], 2) > 0.001);

                            if (drawingToModify.points.length === 0 || hasMovedSignificantly) {
                                const updatedDrawing = { ...drawingToModify, points: [...drawingToModify.points, currPos] };
                                activeDrawingRef.current = updatedDrawing;
                                return updatedDrawing;
                            }
                            activeDrawingRef.current = drawingToModify;
                            return drawingToModify;
                        }
                    });
                } else {
                    if (activeDrawingRef.current) {
                        setCompletedDrawings(prevCompleted => [...prevCompleted, activeDrawingRef.current!]);
                        setActiveDrawing(null);
                        activeDrawingRef.current = null;
                    }
                }

                if (activeChallenge && activeChallenge.check(robotRef.current, robotRef.current, historyRef.current) && !challengeSuccess) { setChallengeSuccess(true); showToast("Mission Accomplished!", "success"); }
            }, TICK_RATE);
        }
        return () => {
            clearInterval(interval);
            if (activeDrawingRef.current) {
                setCompletedDrawings(prevCompleted => [...prevCompleted, activeDrawingRef.current!]);
                setActiveDrawing(null);
                activeDrawingRef.current = null;
            }
        };
    }, [isRunning, customObjects, activeChallenge, challengeSuccess, showToast]);

    const sensorReadings = useMemo(() => calculateSensorReadings(robotState.x, robotState.z, robotState.rotation, activeChallenge?.id, customObjects), [robotState.x, robotState.z, robotState.rotation, activeChallenge, customObjects]);

    const orbitControlsProps = useMemo(() => {
        let props: any = {
            enablePan: true,
            enableRotate: true,
            mouseButtons: {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            },
            minPolarAngle: 0,
            maxPolarAngle: Math.PI,
            minDistance: 1.2,
            maxDistance: 60,
        };

        if (editorTool === 'PAN') {
            props.enablePan = true;
            props.enableRotate = false;
            props.mouseButtons = {
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
            };
        } else if (editorTool === 'ROBOT_MOVE') {
            props.enablePan = false;
            props.enableRotate = false;
        }

        if (isColorPickerActive) {
            props.enablePan = false;
            props.enableRotate = false;
            props.enableZoom = false;
        }

        if (cameraMode === 'TOP') {
            props.enableRotate = false;
            props.minPolarAngle = 0;
            props.maxPolarAngle = 0;
            props.mouseButtons = {
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.DOLLY
            };
        } else if (cameraMode === 'FOLLOW') {
            props.enableRotate = false;
            props.enablePan = false;
            props.minPolarAngle = Math.PI / 6;
            props.maxPolarAngle = Math.PI / 2 - 0.1;
            props.mouseButtons = {
                LEFT: THREE.MOUSE.DOLLY,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.DOLLY
            };
        }

        return props;
    }, [editorTool, cameraMode, isColorPickerActive]);

    useEffect(() => {
        if (controlsRef.current) {
            if (cameraMode === 'HOME') {
                controlsRef.current.reset();
                controlsRef.current.minDistance = 1.2;
                controlsRef.current.maxDistance = 60;
            } else if (cameraMode === 'TOP') {
                controlsRef.current.object.position.set(0, 20, 0);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.minDistance = 0.1;
                controlsRef.current.maxDistance = 100;
            } else if (cameraMode === 'FOLLOW') {
                controlsRef.current.minDistance = 1;
                controlsRef.current.maxDistance = 20;
            }
            controlsRef.current.update();
        }
    }, [cameraMode, controlsRef]);

    const openPythonView = () => {
        if (blocklyEditorRef.current) {
            setIsPythonModalOpen(true);
        }
    };

    const showBlocklyNumpad = useCallback((initialValue: string | number, onConfirm: (newValue: number) => void) => {
        setNumpadConfig({ isOpen: true, value: parseFloat(String(initialValue)), onConfirm });
    }, []);

    const handlePickerHover = useCallback((hexColor: string) => {
        setPickerHoverColor(hexColor);
    }, []);

    const handlePickerSelect = useCallback((hexColor: string) => {
        if (blocklyColorPickCallbackRef.current) {
            blocklyColorPickCallbackRef.current(hexColor);
            blocklyColorPickCallbackRef.current = null;
        }
        setIsColorPickerActive(false);
        setPickerHoverColor(null);
    }, []);

    const showBlocklyColorPicker = useCallback((onPick: (newColor: string) => void) => {
        setIsColorPickerActive(true);
        blocklyColorPickCallbackRef.current = onPick;
    }, []);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50" dir="ltr">
            {toast && (
                <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[500000] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 border-2 ${toast.type === 'success' ? 'bg-green-600 border-green-400 text-white' : toast.type === 'error' ? 'bg-red-600 border-red-400 text-white' : 'bg-blue-600 border-blue-400 text-white'}`}>
                    {toast.type === 'success' ? <Check size={20} /> : toast.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
                    <span className="font-bold text-sm">{toast.message}</span>
                </div>
            )}

            <header className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-lg z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-inner">
                        <Code2 className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-lg font-bold hidden sm:block tracking-tight text-slate-100">Virtual Robotics Lab</h1>
                </div>

                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
                    <button
                        onClick={handleRun}
                        disabled={isRunning || startBlockCount === 0}
                        className={`flex items-center justify-center w-11 h-11 rounded-xl font-bold transition-all transform active:scale-95 ${isRunning || startBlockCount === 0 ? 'bg-slate-700/50 text-slate-600' : 'bg-green-600 text-white hover:bg-green-500'}`}
                        title="הפעל תוכנית"
                    >
                        <Flag size={20} fill={(isRunning || startBlockCount === 0) ? "none" : "currentColor"} />
                    </button>

                    <button
                        onClick={handleReset}
                        className="flex items-center justify-center w-11 h-11 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-md active:shadow-none"
                        title="איפוס"
                    >
                        <RotateCcw size={22} strokeWidth={2.5} />
                    </button>

                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    <button
                        onClick={() => setIsRulerActive(!isRulerActive)}
                        className={`flex items-center justify-center w-11 h-11 rounded-xl font-bold transition-all transform active:scale-95 ${isRulerActive ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                        title="כלי מדידה"
                    >
                        <Ruler size={20} />
                    </button>

                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    <button
                        onClick={() => setProjectModal({ isOpen: true, mode: 'save' })}
                        className="flex items-center justify-center w-11 h-11 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-xl font-bold transition-all transform active:scale-95"
                        title="שמור פרויקט"
                    >
                        <Save size={20} />
                    </button>

                    <button
                        onClick={() => setProjectModal({ isOpen: true, mode: 'load' })}
                        className="flex items-center justify-center w-11 h-11 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-xl font-bold transition-all transform active:scale-95"
                        title="פתח פרויקט"
                    >
                        <FolderOpen size={20} />
                    </button>

                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    <button
                        onClick={openPythonView}
                        className="flex items-center justify-center w-11 h-11 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-xl font-bold transition-all transform active:scale-95"
                        title="קוד פייתון"
                    >
                        <Terminal size={20} />
                    </button>
                </div>

                <button
                    onClick={() => setShowChallenges(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${activeChallenge ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                    <Trophy size={16} />
                    {activeChallenge ? activeChallenge.title : "Challenges"}
                </button>
            </header>

            <main className="flex flex-1 overflow-hidden relative">
                <div className="w-1/2 relative flex flex-col bg-white text-left text-sm border-r border-slate-200">
                    <div className="bg-slate-50 border-b p-2 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <Code2 size={18} className="text-slate-400" />
                            <span className="font-bold text-slate-600 uppercase tracking-tight">Workspace</span>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <BlocklyEditor
                            ref={blocklyEditorRef}
                            onCodeChange={useCallback((code, count) => { setGeneratedCode(code); setStartBlockCount(count); }, [])}
                            visibleVariables={visibleVariables}
                            onToggleVariable={useCallback((n) => setVisibleVariables(v => { const next = new Set(v); if (next.has(n)) next.delete(n); else next.add(n); return next; }), [])}
                            onShowNumpad={showBlocklyNumpad}
                            onShowColorPicker={showBlocklyColorPicker}
                        />
                    </div>
                </div>

                <div className="w-1/2 relative bg-slate-900 overflow-hidden" style={{ cursor: isColorPickerActive ? DROPPER_CURSOR_URL : 'auto' }}>
                    <div className="absolute top-4 right-4 z-50 flex flex-col gap-3">
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-1 flex flex-col overflow-hidden">
                            <button
                                onClick={() => { setCameraMode('HOME'); }}
                                className="p-3 text-blue-600 hover:bg-slate-50 transition-all rounded-xl active:scale-95"
                                title="איפוס מצלמה"
                            >
                                <Home size={22} />
                            </button>

                            <div className="h-px bg-slate-100 mx-2 my-0.5" />

                            <button
                                onClick={() => setCameraMode(prev => prev === 'TOP' ? 'HOME' : 'TOP')}
                                className={`p-3 transition-all rounded-xl active:scale-95 ${cameraMode === 'TOP' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                title="מבט מלמעלה"
                            >
                                <Eye size={22} />
                            </button>

                            <button
                                onClick={() => setCameraMode(prev => prev === 'FOLLOW' ? 'HOME' : 'FOLLOW')}
                                className={`p-3 transition-all rounded-xl active:scale-95 ${cameraMode === 'FOLLOW' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                title="מצלמה עוקבת"
                            >
                                <Target size={22} />
                            </button>

                            <div className="h-px bg-slate-100 mx-2 my-0.5" />

                            <button
                                onClick={() => {
                                    controlsRef.current?.dollyIn(0.9);
                                    controlsRef.current?.update();
                                }}
                                className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                                title="התקרבות (זום אין)"
                            >
                                <ZoomIn size={22} />
                            </button>

                            <button
                                onClick={() => {
                                    controlsRef.current?.dollyOut(0.9);
                                    controlsRef.current?.update();
                                }}
                                className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                                title="התרחקות (זום אאוט)"
                            >
                                <ZoomOut size={22} />
                            </button>

                            <div className="h-px bg-slate-100 mx-2 my-0.5" />

                            <button
                                onClick={() => setEditorTool(prev => prev === 'PAN' ? 'NONE' : 'PAN')}
                                className={`p-3 transition-all rounded-xl active:scale-95 ${editorTool === 'PAN' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                title="כלי גרירה (לחצן שמאלי)"
                            >
                                <Hand size={22} />
                            </button>

                            <button
                                onClick={() => setEditorTool('NONE')}
                                className={`p-3 transition-all rounded-xl active:scale-95 ${editorTool === 'NONE' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                title="כלי סיבוב (לחצן שמאלי)"
                            >
                                <Move size={22} />
                            </button>

                            <button
                                onClick={() => setEditorTool(prev => prev === 'ROBOT_MOVE' ? 'NONE' : 'ROBOT_MOVE')}
                                className={`p-3 transition-all rounded-xl active:scale-95 ${editorTool === 'ROBOT_MOVE' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                title="הזז מיקום רובוט"
                            >
                                <Bot size={22} />
                            </button>
                        </div>
                    </div>

                    <SensorDashboard
                        distance={sensorReadings.distance}
                        isTouching={sensorReadings.isTouching}
                        gyroAngle={sensorReadings.gyro}
                        tiltAngle={sensorReadings.tilt}
                        detectedColor={sensorReadings.color}
                        lightIntensity={sensorReadings.intensity}
                        overrideColor={isColorPickerActive ? pickerHoverColor : null}
                        onColorClick={() => setIsColorPickerActive(!isColorPickerActive)}
                    />

                    <Canvas shadows camera={{ position: [10, 10, 10], fov: 45 }}>
                        <SimulationEnvironment
                            challengeId={activeChallenge?.id}
                            customObjects={customObjects}
                            robotState={robotState}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                        />
                        {completedDrawings.map((path) => (
                            <Line key={path.id} points={path.points} color={path.color} lineWidth={4} />
                        ))}
                        {activeDrawing && activeDrawing.points.length > 1 && (
                            <Line key={activeDrawing.id} points={activeDrawing.points} color={activeDrawing.color} lineWidth={4} />
                        )}
                        <Robot3D state={robotState} isPlacementMode={editorTool === 'ROBOT_MOVE'} />
                        <OrbitControls
                            ref={controlsRef}
                            makeDefault
                            {...orbitControlsProps}
                        />
                        <CameraManager robotState={robotState} cameraMode={cameraMode} controlsRef={controlsRef} />
                        {isRulerActive && <RulerTool />}
                        {isColorPickerActive && (
                            <ColorPickerTool
                                onColorHover={handlePickerHover}
                                onColorSelect={handlePickerSelect}
                            />
                        )}
                    </Canvas>
                </div>
            </main>

            {isPythonModalOpen && (
                <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-slate-700">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                                <FileCode className="text-blue-400" /> Python Code Output
                            </h2>
                            <button
                                onClick={() => setIsPythonModalOpen(false)}
                                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 font-mono text-sm">
                            <pre className="text-blue-300 whitespace-pre-wrap">
                                {blocklyEditorRef.current?.getPythonCode()}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-slate-800 flex justify-end">
                            <button
                                onClick={() => {
                                    const code = blocklyEditorRef.current?.getPythonCode();
                                    if (code) navigator.clipboard.writeText(code);
                                    showToast("Code copied to clipboard!", "success");
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
                            >
                                Copy Code
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {projectModal.isOpen && (
                <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-200">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {projectModal.mode === 'save' ? <Save size={20} className="text-blue-600" /> : <FolderOpen size={20} className="text-orange-600" />}
                                {projectModal.mode === 'save' ? 'שמירת פרויקט' : 'טעינת פרויקט'}
                            </h2>
                            <button onClick={() => setProjectModal({ ...projectModal, isOpen: false })} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button>
                        </div>
                        <div className="p-8 flex flex-col gap-6">
                            {projectModal.mode === 'save' ? (
                                <>
                                    <p className="text-slate-500 text-sm">הורד את סביבת העבודה שלך כקובץ `.{'roby'}` לשמירת ההתקדמות שלך מקומית.</p>
                                    <button
                                        onClick={() => {
                                            const xml = blocklyEditorRef.current?.saveWorkspace();
                                            if (xml) {
                                                const blob = new Blob([xml], { type: 'text/xml' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = 'robot-project.roby';
                                                a.click();
                                                showToast("Project saved successfully!", "success");
                                            }
                                            setProjectModal({ ...projectModal, isOpen: false });
                                        }}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all"
                                    >
                                        הורד פרויקט (קובץ .roby)
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-slate-500 text-sm">בחר קובץ `.{'roby'}` או `.{'xml'}` מהמחשב שלך כדי לשחזר את סביבת העבודה.</p>
                                    <input
                                        type="file"
                                        accept=".roby,.xml"
                                        className="hidden"
                                        id="project-upload"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (re) => {
                                                    const content = re.target?.result as string;
                                                    blocklyEditorRef.current?.loadWorkspace(content);
                                                    showToast("Project loaded successfully!", "success");
                                                    setProjectModal({ ...projectModal, isOpen: false });
                                                };
                                                reader.readAsText(file);
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="project-upload"
                                        className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold shadow-lg text-center cursor-pointer active:scale-95 transition-all"
                                    >
                                        בחר קובץ לטעינה
                                    </label>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Numpad
                isOpen={numpadConfig.isOpen}
                initialValue={numpadConfig.value}
                onConfirm={numpadConfig.onConfirm}
                onClose={() => setNumpadConfig(p => ({ ...p, isOpen: false }))}
            />

            {showChallenges && (
                <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-4 border-slate-200">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <Trophy className="text-yellow-500" /> Coding Challenges
                            </h2>
                            <button
                                onClick={() => setShowChallenges(false)}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                            >
                                <X size={28} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <button
                                    onClick={() => { setActiveChallenge(null); setShowChallenges(false); }}
                                    className={`p-5 rounded-3xl border-4 text-left transition-all hover:scale-[1.02] flex flex-col gap-3 group relative overflow-hidden ${activeChallenge === null ? 'border-blue-500 bg-white shadow-xl' : 'border-white bg-white hover:border-blue-300 shadow-md'}`}
                                >
                                    <h3 className={`font-bold text-lg z-10 transition-colors ${activeChallenge === null ? 'text-blue-600' : 'text-slate-800 group-hover:text-blue-600'}`}>
                                        נהיגה חופשית (ללא משימה)
                                    </h3>
                                    <p className="text-sm text-slate-500 line-clamp-3 z-10">סביבה פתוחה לתרגול חופשי ללא קירות או מסלולים מוגדרים מראש.</p>
                                </button>

                                {CHALLENGES.map((challenge) => (
                                    <button
                                        key={challenge.id}
                                        onClick={() => { setActiveChallenge(challenge); setShowChallenges(false); }}
                                        className={`p-5 rounded-3xl border-4 text-left transition-all hover:scale-[1.02] flex flex-col gap-3 group relative overflow-hidden ${activeChallenge?.id === challenge.id ? 'border-yellow-500 bg-white shadow-xl' : 'border-white bg-white hover:border-blue-300 shadow-md'}`}
                                    >
                                        <h3 className={`font-bold text-lg z-10 transition-colors ${activeChallenge?.id === challenge.id ? 'text-yellow-600' : 'text-slate-800 group-hover:text-blue-600'}`}>
                                            {challenge.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-3 z-10">{challenge.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
