
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three'; // זה יפתור את כל שגיאות ה-THREE שראינו
import { RotateCcw, Code2, Ruler, Trophy, X, Flag, Save, FolderOpen, Check, AlertCircle, Info, Terminal, Star, Home, Eye, Move, Hand, Bot, Target, FileCode, ZoomIn, ZoomOut } from 'lucide-react';

// שים לב לשינוי בנתיבים - מחקנו את ה- "./components/" כי הקבצים נמצאים איתך באותה תיקייה
import BlocklyEditor, { BlocklyEditorHandle } from './BlocklyEditor';
import Robot3D from './Robot3D';
import SimulationEnvironment from './Environment';
import { RobotState, CustomObject, ContinuousDrawing, SimulationHistory, CameraMode, EditorTool, PathShape } from '../types'; // כאן הוספנו נקודה נוספת כי types נמצא בחוץ
import Numpad from './Numpad';
import SensorDashboard from './SensorDashboard';
import RulerTool from './RulerTool';
import ColorPickerTool from './ColorPickerTool';
import CameraManager from './CameraManager';
import { CHALLENGES, Challenge } from '../data/challenges'; // גם כאן יצאנו תיקייה אחת החוצה
import { ThreeEvent } from '@react-three/fiber';

const TICK_RATE = 16;
const BASE_VELOCITY = 0.165; // Retained at 3x original for normal forward movement
const BASE_TURN_SPEED = 3.9; // Increased to 30x original (0.13 * 30) for much faster turning
const TURN_TOLERANCE = 0.5; // degrees - for turn precision

const DROPPER_CURSOR_URL = `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwNC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmb25lIiBzZmlsbC1vcGFjaXR5PSIxIiBzdHJva2U9IiNlYzQ4OTkiIHN0cm9rZS13aWR0aD0iMiIgc3RyYtBLLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtdW5lam9pbj0icm91bmQiPjxwYXRoIGQ9MTAuNTQgOC40NmE1IDUgMCAxIDAtNy4wNyA3LjA3bDEuNDEgMS40MWEyIDIgMCAwIDAgMi44MyAwbDIuODMtMi44M2EyIDIgMCAwIDAgMC0yLjgzbC0xLjQxLTEuNDF6Ii8+PHBhdGggZD0ibTkgMTkgNW0tNy05IDUtNSIvPjxwYXRoIGQ9Ik05LjUgMTQuNSA0IDkiLz48cGF0aCBkPSJtMTggNiAzLTMiLz48cGF0aCBkPSJNMjAuOSA3LjFhMiAyIDAg1IDAtMi44LTy44bC0xLjQgMS40IDIuOCAy.4IDEuNC0x.4eiIvPjwvc3ZnPgo=') 0 24, crosshair`;

// Canonical map for common color names to their representative hex values (aligned with Blockly icons)
const CANONICAL_COLOR_MAP: Record<string, string> = {
    'red': '#EF4444',     // From Blockly's red star
    'green': '#22C55E',   // From Blockly's green square
    'blue': '#3B82F6',    // From Blockly's blue circle
    'yellow': '#EAB308',  // From Blockly's yellow triangle (Blockly's specific yellow)
    'orange': '#F97316',  // From Blockly's orange heart
    'purple': '#A855F7',  // From Blockly's purple moon
    'cyan': '#06B6D4',    // From Blockly's cyan cloud
    'magenta': '#EC4899', // From Blockly's pink diamond (using magenta as the name in code)
    'black': '#000000',
    'white': '#FFFFFF',
};

// Helper function to normalize angles to 0-360 degrees
const normalizeAngle = (angle: number) => (angle % 360 + 360) % 360;

// Helper function to get the shortest difference between two angles
const getAngleDifference = (angle1: number, angle2: number) => {
    let diff = normalizeAngle(angle1 - angle2);
    if (diff > 180) diff -= 360;
    return diff;
};

// Check if two hex colors (or color names) are "close" to each other
const isColorClose = (hex1: string, hex2: string, threshold = 0.2) => { // Changed threshold to 0.2 for stricter comparison
    try {
        if (!hex1 || !hex2) return false;
        const h1 = hex1.toLowerCase();
        const h2 = hex2.toLowerCase();
        if (h1 === h2) return true;

        // Resolve both inputs to their canonical hex values
        const finalH1 = CANONICAL_COLOR_MAP[h1] || (h1.startsWith('#') ? h1 : '#' + h1);
        const finalH2 = CANONICAL_COLOR_MAP[h2] || (h2.startsWith('#') ? h2 : '#' + h2);

        // Handle cases where a name maps to nothing, or input is malformed
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

// פונקציה עם סף רגישות למגע
const isPointInObjectWithTolerance = (px: number, pz: number, obj: CustomObject, tolerance: number) => {
    const { lx, lz } = getLocalCoords(px, pz, obj.x, obj.z, obj.rotation || 0);
    const halfW = obj.width / 2;
    const halfL = (obj.type === 'PATH' && obj.shape === 'CORNER') ? obj.width / 2 : obj.length / 2;
    return Math.abs(lx) <= (halfW + tolerance) && Math.abs(lz) <= (halfL + tolerance);
};

// Modified to include 'type' in complexZones for dynamic tolerance calculation
const getEnvironmentConfig = (challengeId?: string, customObjects: CustomObject[] = []) => {
    let walls: { minX: number, maxX: number, minZ: number, maxZ: number }[] = [];
    let complexZones: { x: number, z: number, width: number, length: number, rotation: number, color: number, shape?: PathShape, type: EditorTool }[] = [];
    if (['c10', 'c16', 'c19', 'c20'].includes(challengeId || '')) walls.push({ minX: -3, maxX: 3, minZ: -10.25, maxZ: -9.75 });
    customObjects.forEach(obj => {
        if (obj.type === 'WALL') { const hW = obj.width / 2; const hL = obj.length / 2; walls.push({ minX: obj.x - hW, maxX: obj.x + hW, minZ: obj.z - hL, maxZ: obj.z + hL }); }
        else if (obj.type === 'PATH') { const lineHex = obj.color || '#FFFF00'; const colorVal = parseInt(lineHex.replace('#', '0x'), 16); complexZones.push({ x: obj.x, z: obj.z, width: obj.width, length: obj.length, rotation: obj.rotation || 0, color: colorVal, shape: obj.shape || 'STRAIGHT', type: obj.type }); }
        else if (obj.type === 'COLOR_LINE') { const hC = obj.color || '#FF0000'; complexZones.push({ x: obj.x, z: obj.z, width: obj.width, length: obj.length, rotation: obj.rotation || 0, color: parseInt(hC.replace('#', '0x'), 16), type: obj.type }); }
        else if (obj.type === 'RAMP') { // Ramps can also have colors
            const rampHex = obj.color || '#334155';
            const colorVal = parseInt(rampHex.replace('#', '0x'), 16);
            // For ramps, the detection zone could be the entire ramp area.
            // For simplicity, let's treat it as a broad color zone for now.
            complexZones.push({ x: obj.x, z: obj.z, width: obj.width, length: obj.length, rotation: obj.rotation || 0, color: colorVal, type: obj.type });
        }
    });
    return { walls, complexZones };
};


// Modified to include challengeId parameter and c18 specific logic
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
    // Reintroduced challenge-specific ramp logic from the user's working version
    if (challengeId === 'c18') {
        if (qx >= -2.1 && qx <= 2.1) {
            if (qz < -0.2 && qz > -3.7) maxHeight = Math.max(maxHeight, ((qz - (-0.2)) / -3.5) * 1.73);
            else if (qz <= -3.7 && qz >= -7.4) maxHeight = Math.max(maxHeight, 1.73);
            else if (qz < -7.4 && qz > -10.9) maxHeight = Math.max(maxHeight, 1.73 - (((qz - (-7.4)) / -3.5) * 1.73));
        }
    }
    return maxHeight;
};

// New simplified checkTouchSensorHit to use `walls` directly
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

// New simplified checkPhysicsHit to use `walls` directly
const checkPhysicsHit = (px: number, pz: number, walls: { minX: number, maxX: number, minZ: number, maxZ: number }[]) => {
    for (const w of walls) {
        if (px >= w.minX && px <= w.maxX && pz >= w.minZ && pz <= w.maxZ) return true;
    }
    return false;
};

// Modified to include challengeId parameter and use getEnvironmentConfig
const calculateSensorReadings = (x: number, z: number, rotation: number, challengeId?: string, customObjects: CustomObject[] = []) => {
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const env = getEnvironmentConfig(challengeId, customObjects); // Use getEnvironmentConfig here
    const gyro = Math.round(normalizeAngle(rotation)); // Use normalizeAngle here

    const getPointWorldPos = (lx: number, lz: number) => ({
        wx: x + (lx * Math.cos(rad) + lz * Math.sin(rad)),
        wz: z + (-lx * Math.sin(rad) + lz * Math.cos(rad))
    });

    // Positions for robot's contact points (wheels/casters)
    const wheelOffsetZ = 0.5; // Approx half of robot body length
    const wheelOffsetX = 0.95; // Approx half of robot body width
    const casterOffsetZ = -0.8; // Approx position of back caster
    const frontSensorPos = getPointWorldPos(0, 1.1); // For tilt calculation, still use an effective front point

    const leftWheelPos = getPointWorldPos(-wheelOffsetX, wheelOffsetZ);
    const rightWheelPos = getPointWorldPos(wheelOffsetX, wheelOffsetZ);
    const backCasterPos = getPointWorldPos(0, casterOffsetZ);

    // Get surface heights at these points, passing challengeId
    const hLeft = getSurfaceHeightAt(leftWheelPos.wx, leftWheelPos.wz, challengeId, customObjects);
    const hRight = getSurfaceHeightAt(rightWheelPos.wx, rightWheelPos.wz, challengeId, customObjects);
    const hBack = getSurfaceHeightAt(backCasterPos.wx, backCasterPos.wz, challengeId, customObjects);
    const hFront = getSurfaceHeightAt(frontSensorPos.wx, frontSensorPos.wz, challengeId, customObjects);


    // Reverted: Calculate y as the average of the contact points (from working version)
    const y = (hLeft + hRight + hBack) / 3;

    // Tilt and Roll calculations using the front/back/side height differences (from working version)
    const frontAvg = (hLeft + hRight) / 2;
    const tilt = Math.atan2(frontAvg - hBack, 1.3) * (180 / Math.PI); // Distance between front/back effective points (1.3 from working version)
    const roll = Math.atan2(hLeft - hRight, wheelOffsetX * 2) * (180 / Math.PI); // Distance between left/right wheels

    // Sensor color reading position (remains the same)
    const cx = x + sin * 0.9;
    const cz = z + cos * 0.9;
    let sensorDetectedColor = "white"; // Renamed for clarity
    let sensorIntensity = 100; // Add intensity as it's in the old working version, though not used widely
    let sensorRawDecimalColor = 0xFFFFFF;

    // --- NEW LOGIC: Prioritize Custom Objects for Color Detection ---
    for (const zZone of env.complexZones) {
        const dx = cx - zZone.x;
        const dz = cz - zZone.z;
        const cR = Math.cos(-zZone.rotation);
        const sR = Math.sin(-zZone.rotation);
        const lX = dx * cR - dz * sR;
        const lZ = dx * sR + dz * cR;
        let onZone = false;

        // Dynamically calculate tolerance based on object dimensions
        // Add a small epsilon (0.1) to the half-width/length for detection "fudge factor"
        const xTolerance = zZone.width / 2 + 0.1;
        const zTolerance = zZone.length / 2 + 0.1;

        if (zZone.type === 'RAMP') {
            // For ramps, check if the sensor is within the ramp's 2D footprint
            const hW_ramp = zZone.width / 2;
            const hL_ramp = zZone.length / 2;
            if (Math.abs(lX) <= (hW_ramp + 0.1) && Math.abs(lZ) <= (hL_ramp + 0.1)) {
                onZone = true;
            }
        }
        else if (zZone.shape === 'STRAIGHT' || !zZone.shape) { // Applies to PATH and COLOR_LINE (default STRAIGHT)
            if (Math.abs(lX) <= xTolerance && Math.abs(lZ) <= zTolerance) onZone = true;
        } else if (zZone.shape === 'CORNER') {
            // Check if within a square area defined by 'width' for corner paths
            const halfCornerWidth = zZone.width / 2;
            if (
                (Math.abs(lX) <= (xTolerance) && lZ >= -0.1 && lZ <= (halfCornerWidth + 0.1)) || // Horizontal arm
                (Math.abs(lZ) <= (zTolerance) && lX >= -0.1 && lX <= (halfCornerWidth + 0.1))    // Vertical arm
            ) {
                onZone = true;
            }
        } else if (zZone.shape === 'CURVED') {
            const midRadius = zZone.length / 2; // This is the nominal radius of the curved path
            // Shift local coordinates to be relative to the arc's center (which is at -midRadius along local X)
            const shiftedLX = lX + midRadius;
            const distFromArcCenter = Math.sqrt(Math.pow(shiftedLX, 2) + Math.pow(lZ, 2));
            const angle = Math.atan2(lZ, shiftedLX); // Angle relative to the arc's center

            // Check if within the ring's width and arc angle (0 to PI/2 for quarter circle)
            const halfPathWidth = zZone.width / 2;
            if (
                Math.abs(distFromArcCenter - midRadius) <= (halfPathWidth + 0.1) && // Sensor is within the path's thickness
                angle >= -0.1 && angle <= Math.PI / 2 + 0.1 // Sensor is within the 0 to 90 degree arc segment
            ) {
                onZone = true;
            }
        }

        if (onZone) {
            sensorRawDecimalColor = zZone.color;
            const hexStr = "#" + sensorRawDecimalColor.toString(16).padStart(6, '0').toUpperCase();

            console.log(`Sensor: Raw detected HEX: ${hexStr} (from object type: ${zZone.type}, shape: ${zZone.shape})`);

            // Map detected hex to common names for easier comparison in Blockly
            // Using the new CANONICAL_COLOR_MAP for consistent naming
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
                sensorDetectedColor = hexStr; // Fallback to raw hex if not a recognized common color
                console.log(`Sensor: No canonical match, using raw HEX: ${hexStr}`);
            }

            // If a custom object is detected, it takes precedence. Break and use this color.
            break;
        }
    }

    // --- OLD LOGIC: Challenge-specific overrides, ONLY IF no custom object color found ---
    if (sensorDetectedColor === "white") { // Only check if no custom object or non-white color found yet
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
                if (isColorClose(sensorDetectedColor, CANONICAL_COLOR_MAP['red'], 0.1) || Math.abs(deg - 0) < markerThreshold || Math.abs(deg - 360) < markerThreshold) { sensorDetectedColor = "red"; sensorIntensity = 40; sensorRawDecimalColor = 0xFF0000; } // Changed to use isColorClose
                else if (isColorClose(sensorDetectedColor, CANONICAL_COLOR_MAP['blue'], 0.1) || Math.abs(deg - 90) < markerThreshold) { sensorDetectedColor = "blue"; sensorIntensity = 30; sensorRawDecimalColor = 0x0000FF; } // Changed to use isColorClose
                else if (isColorClose(sensorDetectedColor, CANONICAL_COLOR_MAP['green'], 0.1) || Math.abs(deg - 180) < markerThreshold) { sensorDetectedColor = "green"; sensorIntensity = 50; sensorRawDecimalColor = 0x22C55E; } // Changed to use isColorClose
                else if (isColorClose(sensorDetectedColor, CANONICAL_COLOR_MAP['yellow'], 0.1) || Math.abs(deg - 270) < markerThreshold) { sensorDetectedColor = "yellow"; sensorIntensity = 80; sensorRawDecimalColor = 0xFFFF00; } // Changed to use isColorClose
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


    // בדיקת חיישן המגע באמצעות הפונקציה החדשה
    const touchSensorPressed = checkTouchSensorHit(x, z, rotation, env.walls);

    // בדיקת התנגשות פיזית לצורך עצירת תנועה (נקודה שונה, פחות קדמית)
    const physicalHitForMovement = checkPhysicsHit(x + sin * 1.5, z + cos * 1.5, env.walls);

    let distance = 255;
    // בדיקת חיישן מרחק - משתמש באותה נקודה כמו חיישן המגע לצורך עקביות
    for (let d = 0; d < 40.0; d += 0.2) {
        if (checkPhysicsHit(x + sin * (1.7 + d), z + cos * (1.7 + d), env.walls)) { // 1.7 יחידות ממרכז הרובוט
            distance = Math.round(d * 10);
            break;
        }
    }

    return {
        gyro,
        tilt,
        roll,
        y,
        isTouching: touchSensorPressed, // חיישן מגע מבוסס על checkTouchSensorHit
        physicalHit: physicalHitForMovement, // התנגשות פיזית מבוססת על checkPhysicsHit
        distance,
        color: sensorDetectedColor,
        intensity: sensorIntensity,
        rawDecimalColor: sensorRawDecimalColor,
        sensorX: cx,
        sensorZ: cz
    };
};


const App: React.FC = () => {
    const [generatedCode, setGeneratedCode] = useState < string > ('');
    const [startBlockCount, setStartBlockCount] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isRulerActive, setIsRulerActive] = useState(false);
    const [isColorPickerActive, setIsColorPickerActive] = useState(false);
    const [customObjects, setCustomObjects] = useState < CustomObject[] > ([]);
    const [cameraMode, setCameraMode] = useState < CameraMode > ('HOME');
    const [editorTool, setEditorTool] = useState < EditorTool > ('NONE');
    const [pickerHoverColor, setPickerHoverColor] = useState < string | null > (null);
    const [showChallenges, setShowChallenges] = useState(false);
    const [activeChallenge, setActiveChallenge] = useState < Challenge | null > (null);
    const [challengeSuccess, setChallengeSuccess] = useState(false);
    const [projectModal, setProjectModal] = useState < { isOpen: boolean, mode: 'save' | 'load' } > ({ isOpen: false, mode: 'save' });
    const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
    const [monitoredValues, setMonitoredValues] = useState < Record < string, any>> ({});
    const [visibleVariables, setVisibleVariables] = useState < Set < string >> (new Set());
    const blocklyEditorRef = useRef < BlocklyEditorHandle > (null);
    const controlsRef = useRef < any > (null); // Reference to OrbitControls
    const historyRef = useRef < SimulationHistory > ({ maxDistanceMoved: 0, touchedWall: false, detectedColors: [], totalRotation: 0 });
    const executionId = useRef(0);
    const [numpadConfig, setNumpadConfig] = useState({ isOpen: false, value: 0, onConfirm: (val: number) => { } });
    const [toast, setToast] = useState < { message: string, type: 'success' | 'info' | 'error' } | null > (null);

    // Refactored drawing state
    const [activeDrawing, setActiveDrawing] = useState < ContinuousDrawing | null > (null);
    const [completedDrawings, setCompletedDrawings] = useState < ContinuousDrawing[] > ([]);
    const activeDrawingRef = useRef < ContinuousDrawing | null > (null); // Ref for immediate access in callbacks

    // REMOVED: This useEffect is removed as activeDrawingRef.current will be updated directly.
    // useEffect(() => { activeDrawingRef.current = activeDrawing; }, [activeDrawing]);

    const robotRef = useRef < RobotState > ({ x: 0, y: 0, z: 0, rotation: 180, tilt: 0, roll: 0, speed: 100, motorLeftSpeed: 0, motorRightSpeed: 0, ledLeftColor: 'black', ledRightColor: 'black', isMoving: false, isTouching: false, penDown: false, penColor: '#000000' });
    const [robotState, setRobotState] = useState < RobotState > (robotRef.current);
    const isPlacingRobot = useRef(false);
    const abortControllerRef = useRef < AbortController | null > (null);
    const listenersRef = useRef < { messages: Record < string, (() => Promise < void>)[] >, colors: { color: string, cb: () => Promise<void>, lastMatch: boolean }[], obstacles: { cb: () => Promise<void>, lastMatch: boolean }[], distances: { threshold: number, cb: () => Promise<void>, lastMatch: boolean }[], variables: Record<string, any>
}> ({ messages: {}, colors: [], obstacles: [], distances: [], variables: {} });

// New state to hold the Blockly color pick callback
const blocklyColorPickCallbackRef = useRef<((color: string) => void) | null>(null);

const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 4000); }, []);

const handleReset = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    executionId.current++;
    const envObjs = activeChallenge?.environmentObjects || [];
    setCustomObjects(envObjs);
    const startX = activeChallenge?.startPosition?.x ?? 0;
    const startZ = activeChallenge?.startPosition?.z ?? 0;
    const startRot = activeChallenge?.startRotation ?? 180;

    // Initial sensor reading for start position
    const sd_initial = calculateSensorReadings(startX, startZ, startRot, activeChallenge?.id, envObjs);
    // Fix: Changed the duplicate 'ledLeftColor' to 'ledRightColor'
    const d = { ...robotRef.current, x: startX, y: sd_initial.y, z: startZ, rotation: startRot, motorLeftSpeed: 0, motorRightSpeed: 0, ledLeftColor: 'black', ledRightColor: 'black', tilt: sd_initial.tilt, roll: sd_initial.roll, penDown: false, isTouching: false };
    robotRef.current = d;
    setRobotState(d);
    setIsRunning(false); setChallengeSuccess(false); setMonitoredValues({});

    // Reset drawing states
    setCompletedDrawings([]);
    setActiveDrawing(null);
    activeDrawingRef.current = null; // Update ref immediately

    historyRef.current = { maxDistanceMoved: 0, touchedWall: false, detectedColors: [], totalRotation: 0 };
    listenersRef.current = { messages: {}, colors: [], obstacles: [], distances: [], variables: {} };
    // Reset camera to home view when resetting the simulation
    if (controlsRef.current) { controlsRef.current.reset(); setCameraMode('HOME'); }
}, [activeChallenge]);

useEffect(() => { handleReset(); }, [activeChallenge, handleReset]);

// General 3D environment pointer handlers for editor tools
const handlePointerDown = useCallback((e: ThreeEvent<MouseEvent>) => {
    // Only handle if color picker is NOT active
    if (isColorPickerActive) return;

    e.stopPropagation(); // Stop event from bubbling up to Canvas if handled
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
    // Only handle if color picker is NOT active
    if (isColorPickerActive) return;

    e.stopPropagation(); // Stop event from bubbling up to Canvas if handled
    if (isPlacingRobot.current && editorTool === 'ROBOT_MOVE') {
        const point = e.point;
        const sd = calculateSensorReadings(point.x, point.z, robotRef.current.rotation, activeChallenge?.id, customObjects);
        const next = { ...robotRef.current, x: point.x, z: point.z, y: sd.y, tilt: sd.tilt, roll: sd.roll };
        robotRef.current = next;
        setRobotState(next);
    }
}, [editorTool, activeChallenge, customObjects, isColorPickerActive]);

const handlePointerUp = useCallback((e: ThreeEvent<MouseEvent>) => {
    // Only handle if color picker is NOT active
    if (isColorPickerActive) return;

    e.stopPropagation(); // Stop event from bubbling up to Canvas if handled
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
            const power = 50 * direction; // Using 50 power as in working version, this power is scaled by robot.speed in loop

            robotRef.current = { ...robotRef.current, motorLeftSpeed: -power, motorRightSpeed: power };

            while (true) {
                checkAbort();
                await new Promise(r => setTimeout(r, TICK_RATE));

                const currentRotation = normalizeAngle(robotRef.current.rotation);
                const diffToTarget = getAngleDifference(targetAbsoluteRotation, currentRotation);

                // If we have passed the target (overshot) or are very close, stop.
                if (direction > 0 && diffToTarget <= TURN_TOLERANCE) break; // Turning right (positive angle), stop if current is >= target.
                if (direction < 0 && diffToTarget >= -TURN_TOLERANCE) break; // Turning left (negative angle), stop if current is <= target.
            }
            robotRef.current = { ...robotRef.current, motorLeftSpeed: 0, motorRightSpeed: 0 };
            // Force set the rotation to the exact target to prevent drift.
            robotRef.current.rotation = targetAbsoluteRotation;
            setRobotState({ ...robotRef.current }); // Update UI state with the precise rotation
        },
        setHeading: async (targetAngle: number) => {
            checkAbort();
            const currentRot = normalizeAngle(robotRef.current.rotation); // Normalize current rotation
            const normalizedTarget = normalizeAngle(targetAngle); // Normalize target angle
            let diff = getAngleDifference(normalizedTarget, currentRot); // Use the utility for shortest difference

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

            // If pen is lifted, finalize the active drawing
            if (!down) {
                if (activeDrawingRef.current) {
                    setCompletedDrawings(prev => [...prev, activeDrawingRef.current!]);
                    setActiveDrawing(null); // Clear active drawing
                    activeDrawingRef.current = null; // Update ref immediately
                }
            }
        },
        setPenColor: async (color: string) => { checkAbort(); robotRef.current.penColor = color; setRobotState(prev => ({ ...prev, penColor: color })); },
        clearPen: async () => {
            checkAbort();
            setCompletedDrawings([]); // Clear all completed drawings
            setActiveDrawing(null); // Clear any active drawing
            activeDrawingRef.current = null; // Update ref immediately
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

            // Simplified calculation of fV and rV from direct motor speeds (from working version)
            const f = current.speed / 100.0;
            const pL = current.motorLeftSpeed / 100.0;
            const pR = current.motorRightSpeed / 100.0;

            let fV_raw = ((pL + pR) / 2.0) * BASE_VELOCITY * f; // Initial forward velocity
            const rV = (pR - pL) * BASE_TURN_SPEED * f; // Rotational velocity (simplified from working version)

            // --- Dynamic Velocity Reduction (retained as an improvement) ---
            let fV_adjusted = fV_raw;
            const sd_current_for_tilt = calculateSensorReadings(current.x, current.z, current.rotation, activeChallenge?.id, customObjects);
            const currentTilt = sd_current_for_tilt.tilt;

            if (Math.abs(currentTilt) > 3) { // Only apply reduction for significant tilt
                let tiltFactor = Math.abs(currentTilt) / 25; // Normalize tilt to a 0-1 range based on a max expected tilt of 25 degrees
                tiltFactor = Math.min(tiltFactor, 1); // Cap at 1

                let reductionMultiplier = 1;

                if (fV_raw > 0 && currentTilt > 0) { // Moving forward, tilting upwards (climbing)
                    reductionMultiplier = Math.max(0.2, 1 - tiltFactor * 0.8); // Reduce speed by up to 80% (min 20% original speed)
                } else if (fV_raw < 0 && currentTilt < 0) { // Moving backward, tilting downwards (climbing backwards)
                    reductionMultiplier = Math.max(0.2, 1 - tiltFactor * 0.8); // Reduce speed by up to 80%
                }
                fV_adjusted = fV_raw * reductionMultiplier;
            }
            // --- End Dynamic Velocity Reduction ---

            const nr_potential = current.rotation + rV;
            const nx_potential = current.x + Math.sin(nr_potential * Math.PI / 180) * fV_adjusted;
            const nz_potential = current.z + Math.cos(nr_potential * Math.PI / 180) * fV_adjusted;

            // Calculate sensor readings for the *potential* next position
            const sd_predicted = calculateSensorReadings(nx_potential, nz_potential, nr_potential, activeChallenge?.id, customObjects);

            // Use sd.isTouching for physical hit detection as in working version
            const finalX = sd_predicted.isTouching ? current.x : nx_potential;
            const finalZ = sd_predicted.isTouching ? current.z : nz_potential;

            // Reverted: Use smoothed Y, Tilt, Roll for the next state (from working version)
            const next = {
                ...current,
                x: finalX,
                z: finalZ,
                y: current.y + (sd_predicted.y - current.y) * 0.3, // Apply smoothing
                tilt: current.tilt + (sd_predicted.tilt - current.tilt) * 0.3, // Apply smoothing
                roll: current.roll + (sd_predicted.roll - current.roll) * 0.3, // Apply smoothing
                rotation: nr_potential, // Update rotation continuously
                isTouching: sd_predicted.isTouching, // Using sd_predicted for consistency
                isMoving: Math.abs(fV_adjusted) > 0.001 || Math.abs(rV) > 0.001,
                sensorX: sd_predicted.sensorX,
                sensorZ: sd_predicted.sensorZ,
            };
            robotRef.current = next; setRobotState(next);

            const curDetectedColor = sd_predicted.color; // Use predicted color as well for consistency
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

            // Update history tracking for challenge checks
            const startX = activeChallenge?.startPosition?.x || 0;
            const startZ = activeChallenge?.startPosition?.z || 0;
            const distMoved = Math.sqrt(Math.pow(next.x - startX, 2) + Math.pow(next.z - startZ, 2));
            historyRef.current.maxDistanceMoved = Math.max(historyRef.current.maxDistanceMoved, distMoved * 10); // *10 to convert meters to cm for history
            if (!historyRef.current.detectedColors.includes(curDetectedColor)) historyRef.current.detectedColors.push(curDetectedColor);
            historyRef.current.totalRotation = robotRef.current.rotation - (activeChallenge?.startRotation ?? 180);

            // --- NEW DRAWING LOGIC ---
            if (next.penDown) {
                const currPos: [number, number, number] = [next.x, next.y + 0.02, next.z];

                setActiveDrawing(prevActiveDrawing => {
                    let drawingToModify = prevActiveDrawing;

                    // If no drawing is active, or the color changed, finalize previous and start new one
                    if (!drawingToModify || drawingToModify.color !== next.penColor) {
                        if (drawingToModify) { // If there was a previous active drawing, add it to completed
                            setCompletedDrawings(oldCompleted => [...oldCompleted, drawingToModify!]);
                        }
                        // Start a new drawing
                        const newDrawing = { id: `path-${Date.now()}`, points: [currPos], color: next.penColor };
                        activeDrawingRef.current = newDrawing; // Update ref immediately
                        return newDrawing;
                    } else {
                        // Continue existing path if pen is down and color hasn't changed
                        // Check if robot has moved enough to add a new point
                        const hasMovedSignificantly = drawingToModify.points.length > 0 &&
                            (Math.pow(currPos[0] - drawingToModify.points[drawingToModify.points.length - 1][0], 2) +
                                Math.pow(currPos[2] - drawingToModify.points[drawingToModify.points.length - 1][2], 2) > 0.001);

                        if (drawingToModify.points.length === 0 || hasMovedSignificantly) {
                            const updatedDrawing = { ...drawingToModify, points: [...drawingToModify.points, currPos] };
                            activeDrawingRef.current = updatedDrawing; // Update ref immediately
                            return updatedDrawing;
                        }
                        // No significant move, return current state (drawingToModify)
                        // It's crucial to update the ref even if state object itself didn't change,
                        // to ensure activeDrawingRef.current always reflects drawingToModify.
                        activeDrawingRef.current = drawingToModify;
                        return drawingToModify;
                    }
                });
            } else { // Pen is up
                if (activeDrawingRef.current) {
                    setCompletedDrawings(prevCompleted => [...prevCompleted, activeDrawingRef.current!]);
                    setActiveDrawing(null);
                    activeDrawingRef.current = null; // Update ref immediately
                }
            }
            // --- END NEW DRAWING LOGIC ---

            if (activeChallenge && activeChallenge.check(robotRef.current, robotRef.current, historyRef.current) && !challengeSuccess) { setChallengeSuccess(true); showToast("Mission Accomplished!", "success"); }
        }, TICK_RATE);
    }
    return () => {
        clearInterval(interval);
        // Ensure any active drawing is finalized when simulation stops or component unmounts
        if (activeDrawingRef.current) {
            setCompletedDrawings(prevCompleted => [...prevCompleted, activeDrawingRef.current!]);
            setActiveDrawing(null);
            activeDrawingRef.current = null; // Update ref immediately
        }
    };
}, [isRunning, customObjects, activeChallenge, challengeSuccess, showToast]); // REMOVED activeDrawing from dependencies.

// Pass activeChallenge?.id to calculateSensorReadings
const sensorReadings = useMemo(() => calculateSensorReadings(robotState.x, robotState.z, robotState.rotation, activeChallenge?.id, customObjects), [robotState.x, robotState.z, robotState.rotation, activeChallenge, customObjects]);

const orbitControlsProps = useMemo(() => {
    // Default properties for OrbitControls
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

    // Apply editor tool overrides
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

    // If color picker is active, disable all OrbitControls interactions
    if (isColorPickerActive) {
        props.enablePan = false;
        props.enableRotate = false;
        props.enableZoom = false;
    }

    // Apply camera mode overrides (these take precedence for rotation and polar angle)
    if (cameraMode === 'TOP') {
        props.enableRotate = false;
        props.minPolarAngle = 0;
        props.maxPolarAngle = 0;
        props.mouseButtons = { // Allow pan with left click for top view
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.DOLLY
        };
    } else if (cameraMode === 'FOLLOW') { // New follow camera mode overrides
        props.enableRotate = false;
        props.enablePan = false;
        props.minPolarAngle = Math.PI / 6;
        props.maxPolarAngle = Math.PI / 2 - 0.1;
        props.mouseButtons = { // Only allow dolly (zoom)
            LEFT: THREE.MOUSE.DOLLY,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.DOLLY
        };
    }

    return props;
}, [editorTool, cameraMode, isColorPickerActive]);

// Effect to handle programmatic camera position and target changes (initial setup for modes)
useEffect(() => {
    if (controlsRef.current) {
        if (cameraMode === 'HOME') {
            controlsRef.current.reset(); // Resets to initial position set in Canvas
            controlsRef.current.minDistance = 1.2; // Restore default zoom limits
            controlsRef.current.maxDistance = 60;
        } else if (cameraMode === 'TOP') {
            controlsRef.current.object.position.set(0, 20, 0); // Position high up
            controlsRef.current.target.set(0, 0, 0); // Look at the origin
            controlsRef.current.minDistance = 0.1; // Allow closer zoom for top view
            controlsRef.current.maxDistance = 100; // Allow further zoom out
        } else if (cameraMode === 'FOLLOW') {
            controlsRef.current.minDistance = 1;
            controlsRef.current.maxDistance = 20;
        }
        controlsRef.current.update(); // Apply changes
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

// Handler for when ColorPickerTool detects a hover color
const handlePickerHover = useCallback((hexColor: string) => {
    setPickerHoverColor(hexColor);
}, []);

// Handler for when ColorPickerTool selects a color
const handlePickerSelect = useCallback((hexColor: string) => {
   if (blocklyColorPickCallbackRef.current) {
    blocklyColorPickCallbackRef.current(hexColor);
}
    setIsColorPickerActive(false);
    setPickerHoverColor(null);
    setBlocklyColorPickCallback(null);
}, [blocklyColorPickCallback]);


const showBlocklyColorPicker = useCallback((onPick: (newColor: string) => void) => {
    setIsColorPickerActive(true); // Activate the color picker tool visually
   blocklyColorPickCallbackRef.current = onPick; // Store the callback from Blockly
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

            {/* Main Control Bar - Designed based on provided image */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
                {/* Run Button (Flag) */}
                <button
                    onClick={handleRun}
                    disabled={isRunning || startBlockCount === 0}
                    className={`flex items-center justify-center w-11 h-11 rounded-xl font-bold transition-all transform active:scale-95 ${isRunning || startBlockCount === 0 ? 'bg-slate-700/50 text-slate-600' : 'bg-green-600 text-white hover:bg-green-500'}`}
                    title="הפעל תוכנית"
                >
                    <Flag size={20} fill={(isRunning || startBlockCount === 0) ? "none" : "currentColor"} />
                </button>

                {/* Reset Button (Rotate) - Highlighted in Red */}
                <button
                    onClick={handleReset}
                    className="flex items-center justify-center w-11 h-11 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-md active:shadow-none"
                    title="איפוס"
                >
                    <RotateCcw size={22} strokeWidth={2.5} />
                </button>

                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                {/* Ruler Toggle */}
                <button
                    onClick={() => setIsRulerActive(!isRulerActive)}
                    className={`flex items-center justify-center w-11 h-11 rounded-xl font-bold transition-all transform active:scale-95 ${isRulerActive ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    title="כלי מדידה"
                >
                    <Ruler size={20} />
                </button>

                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                {/* Save Button */}
                <button
                    onClick={() => setProjectModal({ isOpen: true, mode: 'save' })}
                    className="flex items-center justify-center w-11 h-11 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-xl font-bold transition-all transform active:scale-95"
                    title="שמור פרויקט"
                >
                    <Save size={20} />
                </button>

                {/* Load Button */}
                <button
                    onClick={() => setProjectModal({ isOpen: true, mode: 'load' })}
                    className="flex items-center justify-center w-11 h-11 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-xl font-bold transition-all transform active:scale-95"
                    title="פתח פרויקט"
                >
                    <FolderOpen size={20} />
                </button>

                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                {/* Python View Button */}
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
            {/* Left Side: Blockly Editor */}
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
                        onShowNumpad={showBlocklyNumpad} // Pass the numpad function
                        onShowColorPicker={showBlocklyColorPicker} // Pass the color picker function
                    />
                </div>
            </div>

            {/* Right Side: 3D Simulation */}
            <div className="w-1/2 relative bg-slate-900 overflow-hidden" style={{ cursor: isColorPickerActive ? DROPPER_CURSOR_URL : 'auto' }}>
                {/* Tool Menu Overlay */}
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

                        {/* New Follow Camera Button */}
                        <button
                            onClick={() => setCameraMode(prev => prev === 'FOLLOW' ? 'HOME' : 'FOLLOW')}
                            className={`p-3 transition-all rounded-xl active:scale-95 ${cameraMode === 'FOLLOW' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                            title="מצלמה עוקבת"
                        >
                            <Target size={22} />
                        </button>

                        <div className="h-px bg-slate-100 mx-2 my-0.5" />

                        {/* Zoom In Button */}
                        <button
                            onClick={() => {
                                controlsRef.current?.dollyIn(0.9); // Zoom in
                                controlsRef.current?.update(); // Explicitly update
                            }}
                            className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                            title="התקרבות (זום אין)"
                        >
                            <ZoomIn size={22} />
                        </button>

                        {/* Zoom Out Button */}
                        <button
                            onClick={() => {
                                controlsRef.current?.dollyOut(0.9); // Changed to 0.9 to zoom OUT
                                controlsRef.current?.update(); // Explicitly update
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

                <Canvas
                    shadows
                    camera={{ position: [10, 10, 10], fov: 45 }}
                >
                    <SimulationEnvironment
                        challengeId={activeChallenge?.id}
                        customObjects={customObjects}
                        robotState={robotState}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    />
                    {/* Render completed drawings */}
                    {completedDrawings.map((path) => (
                        <Line key={path.id} points={path.points} color={path.color} lineWidth={4} />
                    ))}
                    {/* Render active drawing */}
                    {activeDrawing && activeDrawing.points.length > 1 && ( // Only render if at least two points to form a line
                        <Line key={activeDrawing.id} points={activeDrawing.points} color={activeDrawing.color} lineWidth={4} />
                    )}
                    <Robot3D state={robotState} isPlacementMode={editorTool === 'ROBOT_MOVE'} />
                    <OrbitControls
                        ref={controlsRef}
                        makeDefault
                        {...orbitControlsProps}
                    />
                    {/* CameraManager component for handling follow camera logic */}
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

        {/* Python Code View Modal */}
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

        {/* Project Management Modal */}
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

        {/* Modals & Overlays */}
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
                            {/* Free Drive Option */}
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

export default App;// JavaScript source code
