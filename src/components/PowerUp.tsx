import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'

export interface PowerUpData {
  id: string
  type: 'speed' | 'damage' | 'health' | 'shield' | 'multishot'
  position: { x: number; y: number; z: number }
  timestamp: number
  duration: number
}

interface PowerUpProps {
  powerUp: PowerUpData
  onCollect: (powerUpId: string) => void
}

const POWER_UP_COLORS = {
  speed: '#00ff00',    // Green
  damage: '#ff4444',   // Red
  health: '#ff69b4',   // Pink
  shield: '#4169e1',   // Blue
  multishot: '#ffa500' // Orange
}

const POWER_UP_ICONS = {
  speed: '⚡',
  damage: '⚔️',
  health: '❤️',
  shield: '🛡️',
  multishot: '✨'
}

export function PowerUp({ powerUp, onCollect }: PowerUpProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const textRef = useRef<any>(null)

  useFrame((state) => {
    if (meshRef.current) {
      // Floating animation
      const floatOffset = Math.sin(state.clock.elapsedTime * 3 + powerUp.id.length) * 0.3
      meshRef.current.position.y = powerUp.position.y + floatOffset

      // Rotation animation
      meshRef.current.rotation.y = state.clock.elapsedTime * 2
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * 0.3

      // Pulsing scale
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2
      meshRef.current.scale.setScalar(scale)
    }

    if (textRef.current) {
      // Keep text facing camera
      textRef.current.lookAt(state.camera.position)
    }
  })

  const handleClick = () => {
    onCollect(powerUp.id)
    // Play collection sound
    if ((window as any).gameAudio) {
      (window as any).gameAudio.playWin()
    }
  }

  return (
    <group>
      {/* Power-up sphere */}
      <Sphere
        ref={meshRef}
        args={[0.3]}
        position={[powerUp.position.x, powerUp.position.y, powerUp.position.z]}
        onClick={handleClick}
      >
        <meshStandardMaterial
          color={POWER_UP_COLORS[powerUp.type]}
          emissive={POWER_UP_COLORS[powerUp.type]}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </Sphere>

      {/* Outer glow ring */}
      <Sphere
        args={[0.4]}
        position={[powerUp.position.x, powerUp.position.y, powerUp.position.z]}
      >
        <meshStandardMaterial
          color={POWER_UP_COLORS[powerUp.type]}
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Power-up icon */}
      <Text
        ref={textRef}
        position={[powerUp.position.x, powerUp.position.y + 0.8, powerUp.position.z]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {POWER_UP_ICONS[powerUp.type]}
      </Text>

      {/* Power-up type label */}
      <Text
        position={[powerUp.position.x, powerUp.position.y - 0.8, powerUp.position.z]}
        fontSize={0.15}
        color={POWER_UP_COLORS[powerUp.type]}
        anchorX="center"
        anchorY="middle"
      >
        {powerUp.type.toUpperCase()}
      </Text>
    </group>
  )
}