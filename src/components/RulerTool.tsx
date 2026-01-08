
import React, { useState } from 'react';
import { Html, Line } from '@react-three/drei';
import { Vector3 } from 'three';

const RulerTool: React.FC = () => {
    const [start, setStart] = useState<Vector3 | null>(null);
    const [end, setEnd] = useState<Vector3 | null>(null);
    const [isMeasuring, setIsMeasuring] = useState(false);

    const handlePointerMove = (e: any) => {
        if (isMeasuring && start) {
            e.stopPropagation();
            setEnd(e.point);
        }
    };

    const handleClick = (e: any) => {
        e.stopPropagation();
        const point = e.point;

        if (!isMeasuring) {
            setStart(point);
            setEnd(point);
            setIsMeasuring(true);
        } else {
            setEnd(point);
            setIsMeasuring(false);
        }
    };

    const distance = start && end ? start.distanceTo(end) : 0;
    const distanceCm = (distance * 10).toFixed(1);

    return (
        <group>
            <mesh 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0.02, 0]} 
                onClick={handleClick}
                onPointerMove={handlePointerMove}
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial visible={false} />
            </mesh>

            <Html position={[0, 0, 0]} fullscreen style={{pointerEvents: 'none', zIndex: 0}}>
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                    <div className={`px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-lg font-bold text-xs transition-all ${
                        isMeasuring ? 'bg-yellow-500/80 text-white' : 'bg-blue-600/60 text-white'
                    }`}>
                        {!isMeasuring && !start ? "Click anywhere to start measuring" : 
                         isMeasuring ? "Move mouse and click again to finish" : 
                         "Click anywhere for a new measurement"}
                    </div>
                </div>
            </Html>

            {start && (
                <mesh position={start}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
                </mesh>
            )}

            {end && (
                <mesh position={end}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
                </mesh>
            )}

            {start && end && (
                <>
                    <Line
                        points={[start, end]}
                        color={isMeasuring ? "#fbbf24" : "#1e40af"}
                        lineWidth={2}
                        dashed={isMeasuring}
                        dashScale={10}
                        gapSize={5}
                    />
                    
                    {(distance > 0.01) && (
                        <Html position={new Vector3().lerpVectors(start, end, 0.5)} zIndexRange={[100, 0]}>
                            <div className={`px-2 py-0.5 rounded-lg shadow-xl font-mono font-bold text-xs whitespace-nowrap transform -translate-y-6 border backdrop-blur-sm transition-all ${
                                isMeasuring 
                                ? 'bg-white/60 border-yellow-500 text-yellow-900' 
                                : 'bg-white/80 border-blue-500 text-blue-900'
                            }`}>
                                {distanceCm} cm
                            </div>
                        </Html>
                    )}
                </>
            )}
        </group>
    );
};

export default RulerTool;