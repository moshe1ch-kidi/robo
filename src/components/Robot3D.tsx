
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { RobotState } from '../types';

interface Robot3DProps {
  state: RobotState;
  isPlacementMode?: boolean;
}

const THEME = {
    yellow: '#FACC15',
    white: '#FFFFFF',
    cyan: '#22D3EE',
    magenta: '#D946EF',
    black: '#171717',
    darkGrey: '#374151',
    lightGrey: '#9CA3AF'
};

const LegoWheel = ({ position, rotation }: { position: [number, number, number], rotation?: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation || [0, 0, Math.PI / 2]} userData={{ isRobotPart: true }}>
      <mesh castShadow receiveShadow userData={{ isRobotPart: true }}>
        <cylinderGeometry args={[0.6, 0.6, 0.4, 40]} />
        <meshStandardMaterial color={THEME.black} roughness={0.8} />
      </mesh>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} rotation={[Math.PI/2, 0, 0]} position={[0, (i - 2) * 0.08, 0]} userData={{ isRobotPart: true }}>
             <torusGeometry args={[0.6, 0.02, 16, 48]} />
             <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <group position={[0, 0, 0]} userData={{ isRobotPart: true }}>
         <mesh userData={{ isRobotPart: true }}>
            <cylinderGeometry args={[0.35, 0.35, 0.42, 32]} />
            <meshStandardMaterial color={THEME.cyan} roughness={0.3} />
         </mesh>
         {[1, -1].map((side) => (
            <group key={side} position={[0, side * 0.211, 0]} rotation={[side === 1 ? 0 : Math.PI, 0, 0]} userData={{ isRobotPart: true }}>
                <mesh rotation={[Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><ringGeometry args={[0.25, 0.35, 32]} /><meshStandardMaterial color={THEME.cyan} /></mesh>
                <mesh rotation={[Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><boxGeometry args={[0.6, 0.1, 0.01]} /><meshStandardMaterial color={THEME.cyan} /></mesh>
                <mesh rotation={[Math.PI/2, 0, Math.PI/2]} userData={{ isRobotPart: true }}><boxGeometry args={[0.6, 0.1, 0.01]} /><meshStandardMaterial color={THEME.cyan} /></mesh>
                <mesh position={[0, 0.001, 0]} rotation={[Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><circleGeometry args={[0.06, 16]} /><meshStandardMaterial color="#111" /></mesh>
            </group>
         ))}
      </group>
    </group>
  );
};

const CasterWheel = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position} userData={{ isRobotPart: true }}>
      <mesh castShadow userData={{ isRobotPart: true }}><sphereGeometry args={[0.2, 32, 32]} /><meshStandardMaterial color="#D0D0D0" metalness={0.9} roughness={0.1} /></mesh>
      <group position={[0, 0.1, 0]} userData={{ isRobotPart: true }}>
        <mesh position={[0, 0.05, 0]} userData={{ isRobotPart: true }}><cylinderGeometry args={[0.22, 0.22, 0.2, 32]} /><meshStandardMaterial color={THEME.cyan} roughness={0.5} /></mesh>
        <mesh position={[0, 0.3, 0]} userData={{ isRobotPart: true }}><boxGeometry args={[0.25, 0.4, 0.35]} /><meshStandardMaterial color={THEME.cyan} roughness={0.5} /></mesh>
      </group>
    </group>
  );
};

const LegoLight = ({ position, color }: { position: [number, number, number], color: string }) => {
  const c = color.toLowerCase();
  const isOff = c === 'black' || c === '#000000' || c === '#000';
  const displayColor = isOff ? '#333' : color;
  const intensity = isOff ? 0 : 3;
  return (
    <group position={position} userData={{ isRobotPart: true }}>
      <mesh position={[0, 0.25, 0]} castShadow userData={{ isRobotPart: true }}><boxGeometry args={[0.25, 0.3, 0.25]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.3} roughness={0.1} metalness={0.1} /></mesh>
      <mesh position={[0, 0.25, 0]} userData={{ isRobotPart: true }}><boxGeometry args={[0.18, 0.22, 0.18]} /><meshStandardMaterial color={displayColor} emissive={displayColor} emissiveIntensity={intensity} toneMapped={false} /></mesh>
      {!isOff && <pointLight position={[0, 0.3, 0]} color={displayColor} intensity={1.5} distance={3} decay={2} />}
    </group>
  );
};

const RobotPen = ({ position, isDown, color }: { position: [number, number, number], isDown: boolean, color: string }) => {
    const groupRef = useRef<Group>(null);
    useFrame(() => { if (groupRef.current) { const targetY = isDown ? -0.4 : 0.2; groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.1; } });
    return (
        <group position={position} userData={{ isRobotPart: true }}>
             <mesh position={[0, 0.2, 0]} userData={{ isRobotPart: true }}><boxGeometry args={[0.3, 0.4, 0.3]} /><meshStandardMaterial color={THEME.darkGrey} /></mesh>
            <group ref={groupRef} userData={{ isRobotPart: true }}>
                <mesh position={[0, 0, 0]} rotation={[0, 0, 0]} castShadow userData={{ isRobotPart: true }}><cylinderGeometry args={[0.08, 0.08, 1, 16]} /><meshStandardMaterial color={THEME.lightGrey} /></mesh>
                <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]} userData={{ isRobotPart: true }}><coneGeometry args={[0.08, 0.2, 16]} /><meshStandardMaterial color={color} /></mesh>
                <mesh position={[0, 0.3, 0]} userData={{ isRobotPart: true }}><cylinderGeometry args={[0.1, 0.1, 0.4, 16]} /><meshStandardMaterial color={color} /></mesh>
            </group>
        </group>
    );
};

const TouchSensor = ({ position, pressed }: { position: [number, number, number], pressed: boolean }) => {
    const plungerPos = pressed ? -0.1 : 0.2;
    return (
        <group position={position} userData={{ isRobotPart: true }}>
            <mesh position={[0, 0.2, -0.2]} userData={{ isRobotPart: true }}><boxGeometry args={[0.4, 0.1, 0.4]} /><meshStandardMaterial color={THEME.magenta} /></mesh>
            <group position={[0, -0.1, 0]} userData={{ isRobotPart: true }}>
                <mesh castShadow userData={{ isRobotPart: true }}><boxGeometry args={[0.45, 0.4, 0.4]} /><meshStandardMaterial color={THEME.white} roughness={0.2} /></mesh>
                <mesh position={[0, 0.15, -0.15]} userData={{ isRobotPart: true }}><boxGeometry args={[0.45, 0.2, 0.2]} /><meshStandardMaterial color={THEME.darkGrey} /></mesh>
            </group>
            <group position={[0, -0.1, plungerPos]} userData={{ isRobotPart: true }}>
                <mesh rotation={[Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><cylinderGeometry args={[0.15, 0.15, 0.4, 32]} /><meshStandardMaterial color="#CC0000" /></mesh>
                <group position={[0, 0, 0.2]} userData={{ isRobotPart: true }}>
                    <mesh userData={{ isRobotPart: true }}><boxGeometry args={[0.3, 0.08, 0.05]} /><meshStandardMaterial color="#111" /></mesh>
                    <mesh userData={{ isRobotPart: true }}><boxGeometry args={[0.08, 0.3, 0.05]} /><meshStandardMaterial color="#111" /></mesh>
                </group>
            </group>
        </group>
    );
};

const ColorSensor = ({ position }: { position: [number, number, number] }) => {
    return (
        <group position={position} userData={{ isRobotPart: true }}>
            <mesh position={[0, 0.2, -0.2]} userData={{ isRobotPart: true }}><boxGeometry args={[0.4, 0.1, 0.4]} /><meshStandardMaterial color={THEME.magenta} /></mesh>
            <group position={[0, -0.1, 0]} userData={{ isRobotPart: true }}>
                <mesh castShadow userData={{ isRobotPart: true }}><boxGeometry args={[0.45, 0.4, 0.5]} /><meshStandardMaterial color={THEME.white} roughness={0.2} /></mesh>
                <mesh position={[0, 0.15, -0.15]} userData={{ isRobotPart: true }}><boxGeometry args={[0.45, 0.2, 0.2]} /><meshStandardMaterial color={THEME.darkGrey} /></mesh>
                <group position={[0, -0.201, 0.1]} rotation={[Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}>
                    <mesh userData={{ isRobotPart: true }}><ringGeometry args={[0.08, 0.14, 32]} /><meshStandardMaterial color="#111" /></mesh>
                    <mesh position={[0, 0, -0.01]} userData={{ isRobotPart: true }}><circleGeometry args={[0.08, 32]} /><meshStandardMaterial color="#000" metalness={0.9} roughness={0.1} /></mesh>
                </group>
                <group position={[0, -0.3, 0.1]} userData={{ isRobotPart: true }}>
                    <mesh rotation={[Math.PI, 0, 0]} userData={{ isRobotPart: true }}><cylinderGeometry args={[0.05, 0.2, 0.4, 16]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} /></mesh>
                    <pointLight intensity={0.5} distance={1} color="#ffffff" />
                </group>
            </group>
        </group>
    );
};

const UltrasonicSensor = ({ position }: { position: [number, number, number] }) => {
    return (
        <group position={position} userData={{ isRobotPart: true }}>
             <mesh castShadow position={[0, 0, -0.1]} userData={{ isRobotPart: true }}><boxGeometry args={[1.4, 0.6, 0.4]} /><meshStandardMaterial color={THEME.white} roughness={0.2} /></mesh>
             <group position={[0, 0, 0.15]} userData={{ isRobotPart: true }}>
                 {[-1, 1].map((side) => (
                     <group key={side} position={[side * 0.35, 0, 0]} userData={{ isRobotPart: true }}>
                        <mesh rotation={[Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><cylinderGeometry args={[0.28, 0.28, 0.2, 32]} /><meshStandardMaterial color="#111" roughness={0.2} /></mesh>
                        <mesh rotation={[0, 0, 0]} position={[0, 0, 0.101]} userData={{ isRobotPart: true }}><torusGeometry args={[0.18, 0.035, 16, 32]} /><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} transparent opacity={0.9} /></mesh>
                        <mesh rotation={[0, 0, 0]} position={[0, 0, 0.08]} userData={{ isRobotPart: true }}><circleGeometry args={[0.15, 32]} /><meshStandardMaterial color="#444" metalness={0.8} roughness={0.6} /></mesh>
                     </group>
                 ))}
                 <mesh position={[0, 0, 0]} userData={{ isRobotPart: true }}><boxGeometry args={[0.3, 0.25, 0.1]} /><meshStandardMaterial color="#111" /></mesh>
             </group>
             <group position={[0, -0.35, 0]} userData={{ isRobotPart: true }}>
                 <mesh userData={{ isRobotPart: true }}><boxGeometry args={[0.3, 0.2, 0.3]} /><meshStandardMaterial color={THEME.lightGrey} /></mesh>
                 <mesh rotation={[0, 0, Math.PI/2]} userData={{ isRobotPart: true }}><cylinderGeometry args={[0.08, 0.08, 0.31, 16]} /><meshStandardMaterial color="#111" /></mesh>
             </group>
        </group>
    );
};

const Robot3D: React.FC<Robot3DProps> = ({ state, isPlacementMode }) => {
  const groupRef = useRef<Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      // Set absolute position. Wheels are at 0 internally but group is shifted up by 0.6.
      // So if state.y is 0, wheels touch 0.
      // Add a small visual offset (0.02) to prevent clipping with the ground/ramps.
      groupRef.current.position.y = state.y + 0.02; 
      groupRef.current.position.x = state.x;
      groupRef.current.position.z = state.z;
      groupRef.current.rotation.y = state.rotation * (Math.PI / 180);
      groupRef.current.rotation.x = state.tilt * (Math.PI / 180);
      groupRef.current.rotation.z = state.roll * (Math.PI / 180);
    }
  });

  return (
    <group ref={groupRef} dispose={null} userData={{ isRobotPart: true }}>
      {/* Visual center is shifted up by wheel radius (0.6) so ground contact is at y=0 */}
      <group position={[0, 0.6, 0]} userData={{ isRobotPart: true }}>
          {isPlacementMode && (
              <group position={[0, -0.6, 0]} userData={{ isRobotPart: true }}>
                  <mesh rotation={[-Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><ringGeometry args={[1.5, 1.7, 32]} /><meshBasicMaterial color="#00e5ff" transparent opacity={0.6} /></mesh>
                  <pointLight intensity={1} color="#00e5ff" distance={3} />
              </group>
          )}

          <group position={[0, 0.5, 0]} userData={{ isRobotPart: true }}>
              <mesh position={[0, -0.4, 0]} castShadow userData={{ isRobotPart: true }}><boxGeometry args={[1.5, 0.2, 2.2]} /><meshStandardMaterial color={THEME.white} /></mesh>
              <mesh position={[0, 0, 0]} castShadow userData={{ isRobotPart: true }}><boxGeometry args={[1.45, 0.6, 2.15]} /><meshStandardMaterial color={THEME.yellow} /></mesh>
              <mesh position={[0, 0.4, 0]} castShadow userData={{ isRobotPart: true }}><boxGeometry args={[1.5, 0.2, 2.2]} /><meshStandardMaterial color={THEME.white} /></mesh>
              <mesh position={[0, 0.51, 0.2]} rotation={[-Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><planeGeometry args={[0.8, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
              <mesh position={[0, 0.51, -0.5]} rotation={[-Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><circleGeometry args={[0.15, 32]} /><meshStandardMaterial color={THEME.cyan} /></mesh>
          </group>
          
          <mesh position={[-0.8, 0.2, 0]} userData={{ isRobotPart: true }}><boxGeometry args={[0.1, 0.2, 2.2]} /><meshStandardMaterial color={THEME.magenta} /></mesh>
          <mesh position={[0.8, 0.2, 0]} userData={{ isRobotPart: true }}><boxGeometry args={[0.1, 0.2, 2.2]} /><meshStandardMaterial color={THEME.magenta} /></mesh>
          
          <LegoWheel position={[-0.95, 0, 0]} />
          <LegoWheel position={[0.95, 0, 0]} />
          <CasterWheel position={[0, -0.4, -0.8]} />
          <CasterWheel position={[0, -0.4, 0.8]} />
          
          <LegoLight position={[-0.6, 1.0, 0.9]} color={state.ledLeftColor} />
          <LegoLight position={[0.6, 1.0, 0.9]} color={state.ledRightColor} />
          <ColorSensor position={[0, -0.1, 0.9]} />
          <UltrasonicSensor position={[0, 0.5, 1.1]} />
          {/* שינוי מיקום חיישן המגע קדימה */}
          <TouchSensor position={[0, -0.2, 1.7]} pressed={state.isTouching} /> 
          <RobotPen position={[0, 0.1, -0.6]} isDown={state.penDown} color={state.penColor} />
          <group position={[0.6, 1.1, -0.5]} userData={{ isRobotPart: true }}>
              <mesh userData={{ isRobotPart: true }}><boxGeometry args={[0.4, 0.2, 0.4]} /><meshStandardMaterial color={THEME.white} /></mesh>
              <mesh position={[0, 0.11, 0]} rotation={[-Math.PI/2, 0, 0]} userData={{ isRobotPart: true }}><circleGeometry args={[0.15, 32]} /><meshBasicMaterial color={THEME.cyan} /></mesh>
          </group>
      </group>
    </group>
  );
};

export default Robot3D;