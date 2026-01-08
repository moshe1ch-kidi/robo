import React, { useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three'; // שינוי חשוב: ייבוא כללי כדי למנוע בעיות בזיהוי סוגים
import { useThree } from '@react-three/fiber';

interface ColorPickerToolProps {
    onColorHover: (hexColor: string) => void;
    onColorSelect: (hexColor: string) => void;
}

const ColorPickerTool: React.FC<ColorPickerToolProps> = ({ onColorHover, onColorSelect }) => {
    const [cursorPos, setCursorPos] = useState<THREE.Vector3 | null>(null);
    const { raycaster, scene, camera, mouse } = useThree();

    const sampleColorUnderMouse = useCallback(() => {
        raycaster.setFromCamera(mouse, camera);
        // אנחנו בודקים את כל האובייקטים בסצנה
        const intersects = raycaster.intersectObjects(scene.children, true);

        let groundPlaneHit: { color: string, point: THREE.Vector3 } | null = null;

        for (const hit of intersects) {
            const object = hit.object as any; // שימוש ב-any זמני כדי למנוע שגיאות TS בבדיקות דינמיות
            
            // 1. סינון אובייקטי עזר
            if (
                object.name === 'picker-interaction-plane' || 
                object.name === 'picker-visual-indicator' || 
                object.name === 'grid-helper' ||
                object.userData?.isRobotPart
            ) {
                continue;
            }

            // 2. טיפול במשטח האדמה
            if (object.name === 'ground-plane') {
                const mat = Array.isArray(object.material) ? object.material[0] : object.material;
                if (mat && mat.color) {
                    const hex = "#" + (mat.color.getHexString?.() || "FFFFFF").toUpperCase();
                    groundPlaneHit = { color: hex, point: hit.point };
                }
                continue; 
            }

            // 3. טיפול באובייקטים צבעוניים (מסלולים וכו')
            if (object.material) {
                const mat = Array.isArray(object.material) ? object.material[0] : object.material;
                
                // בדיקה בטוחה שיש צבע למטריאל
                if (mat && mat.color) {
                    const hex = "#" + mat.color.getHexString().toUpperCase();
                    
                    // אם הצבע הוא לא לבן טהור (רקע) והאובייקט לא שקוף
                    if (hex !== '#FFFFFF' && (mat.opacity === undefined || mat.opacity > 0)) {
                        setCursorPos(hit.point);
                        return hex;
                    }
                }
            }
        }

        if (groundPlaneHit) {
            setCursorPos(groundPlaneHit.point);
            return groundPlaneHit.color;
        }
        
        return "#FFFFFF";
    }, [raycaster, scene, camera, mouse]);

    const handlePointerMove = (e: any) => {
        e.stopPropagation();
        const hex = sampleColorUnderMouse();
        if (hex) onColorHover(hex);
    };

    const handleClick = (e: any) => {
        e.stopPropagation();
        const hex = sampleColorUnderMouse();
        if (hex) onColorSelect(hex);
    };

    return (
        <group>
            <mesh 
                name="picker-interaction-plane"
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0.06, 0]} // הגבהה קלה מעל הרצפה למניעת "הבהוב" (Z-fighting)
                onPointerMove={handlePointerMove}
                onPointerOut={() => setCursorPos(null)}
                onClick={handleClick}
            >
                <planeGeometry args={[200, 200]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {cursorPos && (
                <group position={cursorPos}>
                    <mesh name="picker-visual-indicator" rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
                        <ringGeometry args={[0.15, 0.22, 32]} />
                        <meshBasicMaterial color="#ec4899" transparent opacity={0.9} toneMapped={false} />
                    </mesh>

                    <Html position={[0, 0.4, 0]} center style={{ pointerEvents: 'none' }}>
                         <div className="bg-pink-600 text-white text-[10px] px-3 py-1.5 rounded-full font-bold whitespace-nowrap shadow-2xl border-2 border-white/50" dir="rtl">
                            לחץ לדגימת צבע מהמסלול
                        </div>
                    </Html>
                </group>
            )}
        </group>
    );
};

export default ColorPickerTool;
