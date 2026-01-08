
import { RobotState, CustomObject, SimulationHistory } from '../types';

export interface Challenge {
    id: string;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    check: (startState: RobotState, endState: RobotState, history: SimulationHistory) => boolean;
    startPosition?: { x: number; y: number; z: number };
    startRotation?: number;
    environmentObjects?: CustomObject[];
}

export const CHALLENGES: Challenge[] = [
    // --- EASY CHALLENGES ---
    {
        id: 'c_square_loop',
        title: 'ריבוע הקסם - לולאות',
        description: 'תכנת את הרובוט לנסוע במסלול הריבוע הצהוב. השתמש בלבנת "חזור 4 פעמים"!',
        difficulty: 'Easy',
        check: (start, end, history) => end.x > 14 && end.z < 0,
        startPosition: { x: 0, y: 0, z: 0 },
        startRotation: 180,
        environmentObjects: [
            { "id": "obj_1", "type": "PATH", "shape": "STRAIGHT", "x": 11.45, "z": -3.13, "width": 2.8, "length": 20, "rotation": 1.56, "color": "#FFFF00" },
            { "id": "obj_2", "type": "PATH", "shape": "STRAIGHT", "x": 0.08, "z": -14.58, "width": 2.8, "length": 20, "rotation": -3.14, "color": "#FFFF00" },
            { "id": "obj_3", "type": "PATH", "shape": "CORNER", "x": 0.10, "z": -3.17, "width": 2.8, "length": 2.8, "rotation": 0.00, "color": "#FFFF00" },
            { "id": "obj_4", "type": "PATH", "shape": "CORNER", "x": 0.06, "z": -25.92, "width": 2.8, "length": 2.8, "rotation": -1.55, "color": "#FFFF00" },
            { "id": "obj_5", "type": "PATH", "shape": "CORNER", "x": 22.78, "z": -25.78, "width": 2.8, "length": 2.8, "rotation": 3.14, "color": "#FFFF00" },
            { "id": "obj_6", "type": "PATH", "shape": "STRAIGHT", "x": 11.39, "z": -25.86, "width": 2.8, "length": 20, "rotation": 1.56, "color": "#FFFF00" },
            { "id": "obj_7", "type": "PATH", "shape": "STRAIGHT", "x": 22.83, "z": -14.35, "width": 2.8, "length": 20, "rotation": 0.00, "color": "#FFFF00" },
            { "id": "obj_8", "type": "PATH", "shape": "CORNER", "x": 22.83, "z": -3.03, "width": 2.8, "length": 2.8, "rotation": 1.56, "color": "#FFFF00" }
        ]
    },
    {
        id: 'c2',
        title: 'Directions - Turn in Place',
        description: 'בצע סיבוב מלא של 360 מעלות וחזור לכיוון המקורי.',
        difficulty: 'Easy',
        check: (start, end, history) => Math.abs(history.totalRotation) >= 350
    },
    {
        id: 'c3',
        title: 'Speed - Hill Climb',
        description: 'סע במהירות 100% למרחק 2 מטרים וחזור במהירות 20%.',
        difficulty: 'Easy',
        check: (start, end, history) => history.maxDistanceMoved >= 18
    },
    {
        id: 'c4',
        title: 'Speed - Emergency Brake',
        description: 'סע מהר ועצור בפתאומיות מבלי להחליק.',
        difficulty: 'Easy',
        check: (start, end, history) => history.maxDistanceMoved > 5 && !end.isMoving
    },
    {
        id: 'c6',
        title: 'Lights - Turn Signal',
        description: 'הפעל נורת איתות כתומה למשך 2 שניות לפני תחילת פנייה.',
        difficulty: 'Easy',
        check: (start, end, history) => Math.abs(history.totalRotation) > 10 && (end.ledLeftColor !== 'black' || end.ledRightColor !== 'black')
    },

    // --- MEDIUM CHALLENGES ---
    {
        id: 'c9',
        title: 'Color Identification - Multi-line Path',
        description: 'סע לאורך המסלול וזהה 5 קווים צבעוניים במרחקים שווים. רוחב כל קו 1 ס"מ. הקו האחרון הוא קו עצירה אדום.',
        difficulty: 'Medium',
        check: (start, end, history) => {
            const requiredColors = ['magenta', 'cyan', 'yellow', 'green', 'red'];
            const foundCount = history.detectedColors.filter(c => requiredColors.includes(c.toLowerCase())).length;
            return end.z <= -14.8 && !end.isMoving && foundCount >= 4;
        },
        startPosition: { x: 0, y: 0, z: 0 },
        startRotation: 180,
        environmentObjects: [
            { id: 'line1', type: 'COLOR_LINE', x: 0, z: -3.0, width: 2.5, length: 0.1, color: '#D946EF' },
            { id: 'line2', type: 'COLOR_LINE', x: 0, z: -6.0, width: 2.5, length: 0.1, color: '#06B6D4' },
            { id: 'line3', type: 'COLOR_LINE', x: 0, z: -9.0, width: 2.5, length: 0.1, color: '#FACC15' },
            { id: 'line4', type: 'COLOR_LINE', x: 0, z: -12.0, width: 2.5, length: 0.1, color: '#22C55E' },
            { id: 'line5', type: 'COLOR_LINE', x: 0, z: -15.0, width: 2.5, length: 0.1, color: '#EF4444' }
        ]
    },
    {
        id: 'c1',
        title: 'ניווט בחדר - מסלול קירות',
        description: 'עבור דרך מסדרון הקירות והגע לאזור היעד הירוק מבלי לגעת במכשולים.',
        difficulty: 'Medium',
        check: (start, end, history) => end.x > 14 && end.z < 0,
        startPosition: { x: 0.10, y: 0, z: 0.10 },
        startRotation: 180,
        environmentObjects: [
            { "id": "w1", "type": "WALL", "x": -2.19, "z": -6.15, "width": 0.5, "length": 12, "rotation": 3.12, "color": "#ef4444" },
            { "id": "w2", "type": "WALL", "x": 2.26, "z": -3.97, "width": 0.5, "length": 7.75, "rotation": 0.00, "color": "#ef4444" },
            { "id": "w3", "type": "WALL", "x": 5.50, "z": -7.93, "width": 0.5, "length": 6.95, "rotation": 1.58, "color": "#ef4444" },
            { "id": "w4", "type": "WALL", "x": 3.48, "z": -12.26, "width": 0.5, "length": 11.56, "rotation": -1.57, "color": "#ef4444" }
        ]
    },
    {
        id: 'c5',
        title: 'בקרת רמזור - ניווט כביש',
        description: 'סע לאורך הכביש הצהוב, פנה ימינה ועצור בקו האדום.',
        difficulty: 'Medium',
        check: (start, end, history) => end.x > 8 && end.z < -15,
        startPosition: { x: 0.00, y: 0, z: 0.00 },
        startRotation: 180,
        environmentObjects: [
            { "id": "p1", "type": "PATH", "shape": "STRAIGHT", "x": -0.03, "z": -8.67, "width": 2.8, "length": 14.01, "rotation": 3.13, "color": "#facc15" },
            { "id": "p2", "type": "PATH", "shape": "CORNER", "x": 0.00, "z": -16.67, "width": 2.8, "length": 2.8, "rotation": -1.56, "color": "#FFFF00" },
            { "id": "p3", "type": "PATH", "shape": "STRAIGHT", "x": 4.77, "z": -16.65, "width": 2.8, "length": 6.92, "rotation": 1.56, "color": "#FFFF00" },
            { "id": "l1", "type": "COLOR_LINE", "x": 8.99, "z": -16.62, "width": 2.8, "length": 1.67, "rotation": 1.56, "color": "#FF0000" }
        ]
    },
    {
        id: 'c7',
        title: 'סללום - מסלול מכשולים',
        description: 'נווט סביב 4 מכשולים צבעוניים והגע לקצה המסלול.',
        difficulty: 'Medium',
        check: (start, end, history) => end.z > 22 && !history.touchedWall,
        startPosition: { x: 0, y: 0, z: 0 },
        environmentObjects: [
            { "id": "sl1", "type": "WALL", "x": 0, "z": 5, "width": 0.5, "length": 2, "color": "#ef4444" },
            { "id": "sl2", "type": "WALL", "x": 0, "z": 10, "width": 0.5, "length": 2, "color": "#3b82f6" },
            { "id": "sl3", "type": "WALL", "x": 0, "z": 15, "width": 0.5, "length": 2, "color": "#22c55e" },
            { "id": "sl4", "type": "WALL", "x": 0, "z": 20, "width": 0.5, "length": 2, "color": "#facc15" }
        ]
    },
    {
        id: 'c10',
        title: 'Touch Sensor - Obstacle Retreat',
        description: 'סע עד שתתנגש בקיר. לאחר הנגיעה, סע לאחור עד לקו הירוק.',
        difficulty: 'Medium',
        check: (start, end, history) => history.touchedWall && history.detectedColors.includes('green'),
        environmentObjects: [
            { id: 'w_hit', type: 'WALL', x: 0, z: -10, width: 6, length: 0.5, color: '#FF0000' },
            { id: 'l_green', type: 'COLOR_LINE', x: 0, z: 0.5, width: 2.5, length: 0.5, color: '#22c55e' }
        ]
    },
    {
        id: 'c10_lines',
        title: 'Sensors - Line Counting',
        description: 'ספור 5 קווים שחורים ועצור בקו האדום.',
        difficulty: 'Medium',
        check: (start, end, history) => history.detectedColors.filter(c => c === 'black').length >= 4 && history.detectedColors.includes('red'),
        environmentObjects: [
            { id: 'l1', type: 'COLOR_LINE', x: 0, z: -2, width: 2.5, length: 0.1, color: '#000000' },
            { id: 'l2', type: 'COLOR_LINE', x: 0, z: -4, width: 2.5, length: 0.1, color: '#000000' },
            { id: 'l3', type: 'COLOR_LINE', x: 0, z: -6, width: 2.5, length: 0.1, color: '#000000' },
            { id: 'l4', type: 'COLOR_LINE', x: 0, z: -8, width: 2.5, length: 0.1, color: '#000000' },
            { id: 'l5', type: 'COLOR_LINE', x: 0, z: -10, width: 2.5, length: 0.1, color: '#000000' },
            { id: 'l_stop', type: 'COLOR_LINE', x: 0, z: -15, width: 2.5, length: 1, color: '#FF0000' }
        ]
    },

    // --- HARD CHALLENGES ---
    {
        id: 'c_maze_original',
        title: 'מבוך הקוד המעודכן',
        description: 'נווט במבוך והגע לקו הסיום הירוק.',
        difficulty: 'Hard',
        check: (start, end, history) => end.x > 14 && end.z < 0 && !history.touchedWall,
        startPosition: { x: -18.00, y: 0, z: 0.00 },
        startRotation: 90,
        environmentObjects: [
            { "id": "m_w_top", "type": "WALL", "x": 0, "z": -15, "width": 30, "length": 0.5, "color": "#374151" },
            { "id": "m_w_bottom", "type": "WALL", "x": 0, "z": 15, "width": 30, "length": 0.5, "color": "#374151" },
            { "id": "m_w_left_t", "type": "WALL", "x": -15, "z": -10, "width": 0.5, "length": 10, "color": "#374151" },
            { "id": "m_w_left_b", "type": "WALL", "x": -15, "z": 10, "width": 0.5, "length": 10, "color": "#374151" },
            { "id": "m_w_right_t", "type": "WALL", "x": 15, "z": -12.5, "width": 0.5, "length": 5, "color": "#374151" },
            { "id": "m_w_right_b", "type": "WALL", "x": 15, "z": 5, "width": 0.5, "length": 20, "color": "#374151" },
            { "id": "finish_line", "type": "COLOR_LINE", "x": 16, "z": -7.5, "width": 3, "length": 5, "color": "#22c55e" }
        ]
    },
    {
        id: 'c12',
        title: 'Line Following - Ellipse Track',
        description: 'עקוב אחרי הקו האליפטי השחור למשך הקפה מלאה.',
        difficulty: 'Hard',
        check: (start, end, history) => history.maxDistanceMoved > 22 && history.detectedColors.includes('black'),
        startPosition: { x: 0, y: 0, z: -2 },
        startRotation: 90
    },
    {
        id: 'c21',
        title: 'Line Following - Track Follower',
        description: 'עקוב אחרי הקו השחור המעגלי.',
        difficulty: 'Hard',
        check: (start, end, history) => history.maxDistanceMoved > 11 && history.detectedColors.includes('black'),
        startPosition: { x: 0, y: 0, z: 0 },
        startRotation: 180
    },
    {
        id: 'c18',
        title: 'Gyro - Auto Leveling',
        description: 'טפס על רמפה, חצה את המישור ורד בבטחה.',
        difficulty: 'Hard',
        check: (start, end, history) => history.maxDistanceMoved > 14
    }
];