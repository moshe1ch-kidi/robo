
import React, { useMemo } from 'react';
import { Grid, Environment as DreiEnvironment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import { CustomObject, RobotState } from '../types';
import { ThreeEvent } from '@react-three/fiber'; // Import ThreeEvent here

interface EnvironmentProps {
    challengeId?: string;
    customObjects?: CustomObject[];
    selectedObjectId?: string | null;
    onObjectSelect?: (id: string) => void;
    onPointerDown?: (e: ThreeEvent<MouseEvent>) => void; // Explicitly type
    onPointerMove?: (e: ThreeEvent<MouseEvent>) => void; // Explicitly type
    onPointerUp?: (e: ThreeEvent<MouseEvent>) => void; // Explicitly type
    robotState?: RobotState;

    // No longer needs isColorPickerActive, as ColorPickerTool handles its own events.
    // isColorPickerActive?: boolean;
}

const EllipseMarker = ({ centerX, centerZ, radiusX, radiusZ, angle, width, color }: any) => {
    const x = radiusX * Math.cos(angle);
    const z = radiusZ * Math.sin(angle);
    const nx = x / (radiusX * radiusX);
    const nz = z / (radiusZ / radiusZ); // Changed from radiusZ * radiusZ to radiusZ / radiusZ for ellipse normal calculation
    const rotation = Math.atan2(nx, -nz);
    return (
        <mesh name="challenge-marker" position={[centerX + x, 0.025, centerZ + z]} rotation={[-Math.PI / 2, 0, rotation]}>
            <planeGeometry args={[width, 0.45]} />
            <meshBasicMaterial color={color} />
        </mesh>
    );
};

const UniformEllipse = ({ x = 0, y = 0, z = 0, radiusX = 12, radiusZ = 6, width = 0.4, segments = 128, color = "black" }: any) => {
    const geometry = useMemo(() => {
        const vertices = [];
        const indices = [];
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            const ct = Math.cos(t); const st = Math.sin(t);
            const px = radiusX * ct; const pz = radiusZ * st;
            const nx = (2 * px) / (radiusX * radiusX); const nz = (2 * pz) / (radiusZ * radiusZ);
            const mag = Math.sqrt(nx * nx + nz * nz);
            const nnx = nx / mag; const nnz = nz / mag;
            const halfW = width / 2;
            vertices.push(px + nnx * halfW, 0, pz + nnz * halfW); 
            vertices.push(px - nnx * halfW, 0, pz - nnz * halfW); 
            if (i < segments) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices); geo.computeVertexNormals(); return geo;
    }, [radiusX, radiusZ, width, segments]);
    return (
        <mesh name="challenge-path" geometry={geometry} position={[x, y, z]} receiveShadow>
            <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
    );
};

const SimulationEnvironment: React.FC<EnvironmentProps> = ({ 
    challengeId, 
    customObjects = [], 
    selectedObjectId,
    onObjectSelect,
    onPointerDown, 
    onPointerMove, 
    onPointerUp,
    robotState,
    // Removed isColorPickerActive prop as it's no longer needed here
    // isColorPickerActive
}) => {
  const config = useMemo(() => {
      const isRoomNav = challengeId === 'c1';
      const isLineTrack = ['c11', 'c10_lines'].includes(challengeId || '');
      const isEllipseTrack = challengeId === 'c12';
      const isFrontWall = ['c10', 'c16', 'c19', 'c20'].includes(challengeId || '');
      const isLineFollow = ['c21'].includes(challengeId || '');
      const isSlope = challengeId === 'c3';
      const isAutoLevel = challengeId === 'c18';
      const isGrayRoad = ['c10', 'c10_lines', 'c11', 'c9'].includes(challengeId || '');
      const isComplexPath = ['c14', 'c15'].includes(challengeId || '');
      return { isRoomNav, isLineTrack, isFrontWall, isLineFollow, isSlope, isAutoLevel, isEllipseTrack, isGrayRoad, isComplexPath };
  }, [challengeId]);

  return (
    <>
      <DreiEnvironment preset="city" />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      
      <mesh 
        name="ground-plane"
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.01, 0]} 
        receiveShadow 
        // Reverted to always attach pointer events to ground-plane.
        // ColorPickerTool's interaction plane will be positioned above it and handle stopping propagation.
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={(e) => { e.stopPropagation(); if (onObjectSelect) onObjectSelect("GROUND"); }} 
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      <Grid name="grid-helper" infiniteGrid={false} args={[100, 100]} fadeDistance={50} sectionSize={5} cellSize={1} sectionColor="#ff4d4d" cellColor="#ffcccc" position={[0, 0.01, 0]} />
      <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
      
      <mesh name="start-marker" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.4, 1.5, 4, 1, Math.PI/4]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {robotState && robotState.sensorX !== undefined && (
          <group position={[robotState.sensorX, 0.03, robotState.sensorZ]}>
              <mesh rotation={[-Math.PI/2, 0, 0]}>
                  <ringGeometry args={[0, 0.1, 16]} />
                  <meshBasicMaterial color="#ec4899" transparent opacity={0.6} toneMapped={false} />
              </mesh>
              <mesh rotation={[-Math.PI/2, 0, 0]}>
                  <ringGeometry args={[0.08, 0.12, 16]} />
                  <meshBasicMaterial color="#ec4899" toneMapped={false} />
              </mesh>
          </group>
      )}

      {customObjects.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          // Updated handleSelect to check isColorPickerActive BEFORE handling selection,
          // ensuring picker interaction is prioritized.
          const handleSelect = (e: ThreeEvent<MouseEvent>) => { 
            // if (isColorPickerActive) { e.stopPropagation(); return; } // Removed conditional
            e.stopPropagation(); 
            if (onObjectSelect) onObjectSelect(obj.id); 
          };

          return (
            <group key={obj.id} position={[obj.x, 0, obj.z]} rotation={[0, obj.rotation || 0, 0]}>
                {obj.type === 'WALL' && (
                    <mesh name="custom-wall" position={[0, 0.5, 0]} castShadow receiveShadow onClick={handleSelect}>
                        <boxGeometry args={[obj.width, 1, obj.length]} />
                        <meshStandardMaterial color={obj.color || "#ef4444"} roughness={0.2} transparent opacity={obj.opacity ?? 1} />
                        {isSelected && ( <mesh scale={[1.02, 1.02, 1.02]}><boxGeometry args={[obj.width, 1, obj.length]} /><meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.5} /></mesh> )}
                    </mesh>
                )}
                {obj.type === 'RAMP' && (
                    <group name="custom-ramp" onClick={handleSelect}>
                        {(() => {
                            const section = obj.length / 3;
                            const h = obj.height || 1.0;
                            const slopeL = Math.sqrt(section * section + h * h);
                            const slopeAngle = Math.atan2(h, section);
                            const t = 0.05; // עובי המשטח
                            
                            return (
                                <>
                                    {/* משטח עלייה */}
                                    <mesh rotation={[-slopeAngle, 0, 0]} position={[0, h/2, -section]}>
                                        <boxGeometry args={[obj.width, t, slopeL]} />
                                        <meshStandardMaterial color={obj.color || "#334155"} transparent opacity={obj.opacity ?? 1} />
                                    </mesh>
                                    {/* משטח עליון ישר */}
                                    <mesh position={[0, h, 0]}>
                                        <boxGeometry args={[obj.width, t, section]} />
                                        <meshStandardMaterial color={obj.color || "#475569"} transparent opacity={obj.opacity ?? 1} />
                                    </mesh>
                                    {/* משטח ירידה */}
                                    <mesh rotation={[slopeAngle, 0, 0]} position={[0, h/2, section]}>
                                        <boxGeometry args={[obj.width, t, slopeL]} />
                                        <meshStandardMaterial color={obj.color || "#334155"} transparent opacity={obj.opacity ?? 1} />
                                    </mesh>
                                    {/* גוף מילוי מתחת למשטח הישר */}
                                    <mesh position={[0, h/2, 0]}>
                                        <boxGeometry args={[obj.width, h, section]} />
                                        <meshStandardMaterial color={obj.color || "#1e293b"} transparent opacity={(obj.opacity ?? 1) * 0.4} />
                                    </mesh>
                                </>
                            );
                        })()}
                    </group>
                )}
                {obj.type === 'COLOR_LINE' && (
                    <mesh name="custom-marker" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} onClick={handleSelect}>
                        <planeGeometry args={[obj.width, obj.length]} />
                        <meshBasicMaterial color={obj.color || '#FF0000'} transparent opacity={obj.opacity ?? 1} />
                    </mesh>
                )}
                {obj.type === 'PATH' && (
                    <group name="custom-path" onClick={handleSelect}>
                        {(!obj.shape || obj.shape === 'STRAIGHT') && (
                            <>
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow><planeGeometry args={[obj.width, obj.length]} /><meshBasicMaterial color="black" transparent opacity={obj.opacity ?? 1} /></mesh>
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><planeGeometry args={[0.2, obj.length]} /><meshBasicMaterial color={obj.color || "#FFFF00"} transparent opacity={obj.opacity ?? 1} /></mesh>
                            </>
                        )}
                        {obj.shape === 'CORNER' && (
                            <>
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow><planeGeometry args={[obj.width, obj.width]} /><meshBasicMaterial color="black" transparent opacity={obj.opacity ?? 1} /></mesh>
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[obj.width/4 - 0.05, 0.025, 0]}><planeGeometry args={[obj.width/2 + 0.1, 0.2]} /><meshBasicMaterial color={obj.color || "#FFFF00"} transparent opacity={obj.opacity ?? 1} /></mesh>
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -obj.width/4 + 0.05]}><planeGeometry args={[0.2, obj.width/2 + 0.1]} /><meshBasicMaterial color={obj.color || "#FFFF00"} transparent opacity={obj.opacity ?? 1} /></mesh>
                            </>
                        )}
                        {obj.shape === 'CURVED' && (
                            <>
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-obj.length/2, 0.02, 0]}><ringGeometry args={[obj.length/2 - obj.width/2, obj.length/2 + obj.width/2, 64, 1, 0, Math.PI/2]} /><meshBasicMaterial color="black" transparent opacity={obj.opacity ?? 1} /></mesh>
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-obj.length/2, 0.025, 0]}><ringGeometry args={[obj.length/2 - 0.1, obj.length/2 + 0.1, 64, 1, 0, Math.PI/2]} /><meshBasicMaterial color={obj.color || "#FFFF00"} transparent opacity={obj.opacity ?? 1} /></mesh>
                            </>
                        )}
                        {isSelected && ( <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.03, 0]}><planeGeometry args={[obj.width + 0.2, (obj.shape === 'CORNER' ? obj.width : obj.length) + 0.2]} /><meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.3} /></mesh> )}
                    </group>
                )}
            </group>
          );
      })}

      {/* Reintroduced environment elements from the working version */}
      {config.isGrayRoad && (
          <mesh name="road-background" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -7.5]} receiveShadow><planeGeometry args={[2.5, 15]} /><meshStandardMaterial color="#64748b" roughness={0.8} /></mesh>
      )}

      {config.isComplexPath && (
          <group position={[0, 0, 0]}>
              <mesh name="road-background" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -7.5]} receiveShadow><planeGeometry args={[3, 16]} /><meshStandardMaterial color="#94a3b8" roughness={0.8} /></mesh>
              <mesh name="challenge-marker" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -11]}><planeGeometry args={[3, 3]} /><meshBasicMaterial color="#0000FF" /></mesh>
              <mesh name="road-background" rotation={[-Math.PI / 2, 0, 0]} position={[-3, 0.015, -11]} receiveShadow><planeGeometry args={[3, 3]} /><meshStandardMaterial color="#94a3b8" roughness={0.8} /></mesh>
              <mesh name="challenge-marker" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -5]}><planeGeometry args={[3, 3]} /><meshBasicMaterial color="#FF0000" /></mesh>
              <mesh name="road-background" rotation={[-Math.PI / 2, 0, 0]} position={[3, 0.015, -5]} receiveShadow><planeGeometry args={[3, 3]} /><meshStandardMaterial color="#94a3b8" roughness={0.8} /></mesh>
              <Text position={[0, 0.1, -1]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.3} color="white">START</Text>
          </group>
      )}

      {config.isRoomNav && (
          <group position={[0, 0, 0]}>
              <mesh name="road-background" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -5]} receiveShadow><planeGeometry args={[2.5, 10]} /><meshStandardMaterial color="#64748b" roughness={0.8} /></mesh>
              <mesh name="road-background" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -10]} receiveShadow><planeGeometry args={[2.5, 2.5]} /><meshStandardMaterial color="#64748b" roughness={0.8} /></mesh>
              <mesh name="road-background" rotation={[-Math.PI / 2, 0, 0]} position={[3.75, 0.03, -10]} receiveShadow><planeGeometry args={[5, 2.5]} /><meshStandardMaterial color="#64748b" roughness={0.8} /></mesh>
              <Text position={[0, 0.1, -1]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.3} color="white">START</Text>
              <mesh name="challenge-marker" rotation={[-Math.PI / 2, 0, 0]} position={[6.25, 0.04, -10]}><ringGeometry args={[0.8, 1.0, 32]} /><meshBasicMaterial color="#ff0000" /></mesh>
              <Text position={[6.25, 0.1, -10]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.4} color="#ff0000">FINISH</Text>
          </group>
      )}

      {config.isAutoLevel && (
          <group position={[0, 0, 0]}>
              <mesh rotation={[0.523, 0, 0]} position={[0, 0.86 - 0.05, -2]} receiveShadow castShadow><boxGeometry args={[4.2, 0.1, 3.46]} /><meshStandardMaterial color="#334155" /></mesh>
              <mesh position={[0, 1.73 - 0.05, -5.5]} receiveShadow castShadow><boxGeometry args={[4.2, 0.1, 4]} /><meshStandardMaterial color="#475569" /></mesh>
              <mesh rotation={[-0.523, 0, 0]} position={[0, 0.86 - 0.05, -9]} receiveShadow castShadow><boxGeometry args={[4.2, 0.1, 3.46]} /><meshStandardMaterial color="#334155" /></mesh>
              <mesh name="road-background" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -14.5]} receiveShadow><planeGeometry args={[4.2, 8]} /><meshStandardMaterial color="#64748b" /></mesh>
              <mesh name="challenge-marker" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -17.5]}><planeGeometry args={[4.2, 0.5]} /><meshBasicMaterial color="#ff0000" /></mesh>
              <Text position={[0, 0.1, -0.4]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.3} color="white">STEEP RAMP</Text>
          </group>
      )}

      {config.isSlope && (
          <group position={[0, 0, 0]}>
              <mesh name="road-background" rotation={[0.0665, 0, 0]} position={[0, 0.5 - 0.025, -9]} receiveShadow castShadow><boxGeometry args={[4.2, 0.05, 15]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          </group>
      )}

      {config.isFrontWall && (
          <group position={[0, 0.5, -10]}><mesh name="challenge-wall" receiveShadow castShadow><boxGeometry args={[6, 1, 0.5]} /><meshStandardMaterial color="#ff0000" roughness={0.2} /></mesh></group>
      )}

      {config.isLineFollow && (
         <group position={[-6, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><mesh name="challenge-path"><ringGeometry args={[5.8, 6.2, 128]} /><meshBasicMaterial color="black" /></mesh></group>
      )}

      {config.isEllipseTrack && (
         <group>
            <UniformEllipse x={0} y={0.02} z={-8} radiusX={9} radiusZ={6} width={0.4} />
            <EllipseMarker centerX={0} centerZ={-8} radiusX={9} radiusZ={6} angle={0} width={0.08} color="#FF0000" />
            <EllipseMarker centerX={0} centerZ={-8} radiusX={9} radiusZ={6} angle={Math.PI / 2} width={0.08} color="#0000FF" />
            <EllipseMarker centerX={0} centerZ={-8} radiusX={9} radiusZ={6} angle={Math.PI} width={0.08} color="#22C55E" />
            <EllipseMarker centerX={0} centerZ={-8} radiusX={9} radiusZ={6} angle={3 * Math.PI / 2} width={0.08} color="#FFFF00" />
         </group>
      )}
    </>
  );
};

export default SimulationEnvironment;