
import React, { useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { Vector3, Mesh, Color } from 'three';
import { useThree } from '@react-three/fiber';

interface ColorPickerToolProps {
    onColorHover: (hexColor: string) => void;
    onColorSelect: (hexColor: string) => void;
}

const ColorPickerTool: React.FC<ColorPickerToolProps> = ({ onColorHover, onColorSelect }) => {
    const [cursorPos, setCursorPos] = useState<Vector3 | null>(null);
    const { raycaster, scene, camera, mouse } = useThree();

    const sampleColorUnderMouse = useCallback(() => {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        // Refactor: Simplify initial log, detailed material info is handled in the loop below
        console.log("ColorPickerTool: Intersects found:", intersects.length, intersects.map(i => ({ name: i.object.name, type: i.object.type, position: i.object.position.toArray() })));
        
        let groundPlaneHit: { color: string, point: Vector3 } | null = null;

        for (const hit of intersects) {
            const object = hit.object;
            
            // Skip helper objects and robot parts immediately
            if (
                object.name === 'picker-interaction-plane' || 
                object.name === 'picker-visual-indicator' || 
                object.name === 'grid-helper' ||
                object.userData?.isRobotPart
            ) {
                console.log(`ColorPickerTool: Skipping helper/robot part: ${object.name || object.type}`);
                continue;
            }

            // If it's the ground plane, store it as a potential fallback, but continue searching for other objects
            // The ground-plane itself might be white, but we want to allow other colored objects on top to be picked.
            if (object.name === 'ground-plane') {
                if (object instanceof Mesh && object.material) {
                    const materials = Array.isArray(object.material) ? object.material : [object.material];
                    for (const mat of materials) {
                        if (mat.color && mat.color instanceof Color) {
                            groundPlaneHit = { color: "#" + mat.color.getHexString().toUpperCase(), point: hit.point };
                            console.log("ColorPickerTool: Storing ground-plane as fallback.");
                            break; // Only need one color from ground
                        }
                    }
                }
                continue; // Always continue after processing ground-plane, look for objects *on* it
            }

            // For all other relevant meshes, try to get their color
            if (object instanceof Mesh && object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                
                for (const mat of materials) {
                    if (mat.color && mat.color instanceof Color) {
                        const hex = "#" + mat.color.getHexString().toUpperCase();
                        
                        // If we find a non-white, non-transparent color, this is the best hit.
                        // Prioritize this immediately.
                        // We also check for mat.opacity to avoid picking invisible objects if they exist in the scene graph.
                        if (hex !== '#FFFFFF' && mat.opacity > 0) {
                            console.log(`ColorPickerTool: Detected primary colored object: ${object.name || object.type} with color ${hex}, material type: ${mat.type}`);
                            setCursorPos(hit.point);
                            return hex; // Found the color, return it immediately
                        } else {
                            // If it's a white or transparent object, keep searching for something else.
                            console.log(`ColorPickerTool: Skipping white or transparent object: ${object.name || object.type}, material type: ${mat.type}, looking for something more specific.`);
                            continue;
                        }
                    }
                }
            }
        }

        // If we reached here, no distinct non-white object was found.
        // Fallback to the ground plane's color if it was hit.
        if (groundPlaneHit) {
            console.log(`ColorPickerTool: Falling back to ground-plane color: ${groundPlaneHit.color}`);
            setCursorPos(groundPlaneHit.point);
            return groundPlaneHit.color;
        }
        
        // If nothing else, return default white
        console.log("ColorPickerTool: No colored object or ground-plane detected, returning default white.");
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

    const handlePointerOut = () => {
        setCursorPos(null);
    };

    return (
        <group>
            {/* משטח אינטראקציה בלתי נראה שתופס את העכבר */}
            <mesh 
                name="picker-interaction-plane"
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0.05, 0]} 
                onPointerMove={handlePointerMove}
                onPointerOut={handlePointerOut}
                onClick={handleClick}
            >
                <planeGeometry args={[200, 200]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {cursorPos && (
                <group position={cursorPos}>
                    {/* עיגול ויזואלי סביב העכבר */}
                    <mesh name="picker-visual-indicator" rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
                        <ringGeometry args={[0.15, 0.22, 32]} />
                        <meshBasicMaterial color="#ec4899" transparent opacity={0.9} toneMapped={false} />
                    </mesh>

                    <Html position={[0, 0.4, 0]} center style={{ pointerEvents: 'none' }}>
                         <div className="bg-pink-600 text-white text-[10px] px-3 py-1.5 rounded-full font-bold whitespace-nowrap shadow-2xl border-2 border-white/50 animate-pulse" dir="rtl">
                            לחץ לדגימת צבע מהמסלול
                        </div>
                    </Html>
                </group>
            )}
        </group>
    );
};

export default ColorPickerTool;