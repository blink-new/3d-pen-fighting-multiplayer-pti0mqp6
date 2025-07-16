import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Box, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Sword, Shield, Heart, Users, MessageCircle, Target, Zap, Clock, Trophy } from 'lucide-react'
import { blink } from '../blink/client'
import { PowerUp } from './PowerUp'
import type { Player, GameState, PenStroke, GameMessage, PowerUpData, ActivePowerUp } from '../types/game'
import type { GameMode } from './GameModeSelector'

interface GameArenaProps {
  roomId: string
  playerName: string
  currentUser: any
  gameMode: GameMode
  onLeaveGame: () => void
}

// Enhanced 3D Pen Stroke Component with glow effect
function PenStrokeRenderer({ stroke, isAttacking = false }: { stroke: PenStroke; isAttacking?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current && isAttacking) {
      // Add pulsing glow effect for attacking strokes
      const intensity = Math.sin(state.clock.elapsedTime * 10) * 0.3 + 0.7
      meshRef.current.material.emissiveIntensity = intensity
    }
  })

  if (stroke.points.length < 2) return null

  const points = stroke.points.map(p => new THREE.Vector3(p.x, p.y, p.z))
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, points.length * 2, stroke.thickness, 8, false)
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color={stroke.color} 
        emissive={isAttacking ? stroke.color : '#000000'}
        emissiveIntensity={isAttacking ? 0.5 : 0}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

// Enhanced Player Avatar Component with health visualization
function PlayerAvatar({ player, isCurrentPlayer }: { player: Player; isCurrentPlayer: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const healthBarRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.set(player.position.x, player.position.y, player.position.z)
      meshRef.current.rotation.set(player.rotation.x, player.rotation.y, player.rotation.z)
      
      // Add floating animation
      const floatOffset = Math.sin(state.clock.elapsedTime * 2 + player.id.length) * 0.1
      meshRef.current.position.y = player.position.y + floatOffset
      
      // Pulse effect when drawing
      if (player.isDrawing) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1
        meshRef.current.scale.setScalar(scale)
      } else {
        meshRef.current.scale.setScalar(1)
      }
    }
    
    // Update health bar
    if (healthBarRef.current) {
      const healthPercent = player.health / 100
      healthBarRef.current.scale.x = healthPercent
      
      // Change color based on health
      const material = healthBarRef.current.material as THREE.MeshStandardMaterial
      if (healthPercent > 0.6) {
        material.color.setHex(0x00ff00) // Green
      } else if (healthPercent > 0.3) {
        material.color.setHex(0xffff00) // Yellow
      } else {
        material.color.setHex(0xff0000) // Red
      }
    }
  })

  return (
    <group>
      {/* Player Sphere */}
      <Sphere ref={meshRef} args={[0.5]} position={[player.position.x, player.position.y, player.position.z]}>
        <meshStandardMaterial 
          color={player.color} 
          emissive={isCurrentPlayer ? player.color : (player.isDrawing ? player.color : '#000000')}
          emissiveIntensity={isCurrentPlayer ? 0.3 : (player.isDrawing ? 0.5 : 0)}
          transparent
          opacity={player.health > 0 ? 1 : 0.5}
        />
      </Sphere>
      
      {/* Player Name */}
      <Text
        position={[player.position.x, player.position.y + 1.2, player.position.z]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {player.name} {isCurrentPlayer && '(You)'}
      </Text>
      
      {/* Health Bar Background */}
      <Box 
        args={[1, 0.1, 0.02]} 
        position={[player.position.x, player.position.y + 0.8, player.position.z]}
      >
        <meshStandardMaterial color="#333333" transparent opacity={0.7} />
      </Box>
      
      {/* Health Bar */}
      <Box 
        ref={healthBarRef}
        args={[1, 0.08, 0.03]} 
        position={[player.position.x, player.position.y + 0.8, player.position.z]}
      >
        <meshStandardMaterial color="#00ff00" />
      </Box>
      
      {/* Drawing Indicator */}
      {player.isDrawing && (
        <Sphere args={[0.1]} position={[player.position.x, player.position.y + 0.6, player.position.z]}>
          <meshStandardMaterial 
            color="#ffffff" 
            emissive="#ffffff" 
            emissiveIntensity={0.8}
          />
        </Sphere>
      )}
    </group>
  )
}

// Camera Controller for POV
function POVCamera({ player }: { player: Player }) {
  const { camera } = useThree()
  
  useFrame(() => {
    const offset = new THREE.Vector3(0, 2, 5)
    offset.applyEuler(new THREE.Euler(player.rotation.x, player.rotation.y, player.rotation.z))
    
    camera.position.set(
      player.position.x + offset.x,
      player.position.y + offset.y,
      player.position.z + offset.z
    )
    
    camera.lookAt(player.position.x, player.position.y, player.position.z)
  })
  
  return null
}

// Main Game Arena Component
export function GameArena({ roomId, playerName, currentUser, gameMode, onLeaveGame }: GameArenaProps) {
  const [gameState, setGameState] = useState<GameState>({
    players: {},
    gameStatus: 'waiting',
    gameMode: {
      id: gameMode.id,
      name: gameMode.name,
      duration: gameMode.duration,
      maxPlayers: gameMode.maxPlayers
    },
    powerUps: {},
    roomId,
    leaderboard: []
  })
  const [currentPlayerId] = useState(currentUser.id)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState<PenStroke | null>(null)
  const [chatMessages, setChatMessages] = useState<string[]>([])
  const [povMode, setPovMode] = useState(false)
  const [keys, setKeys] = useState<Record<string, boolean>>({})
  const [gameTimer, setGameTimer] = useState<number>(0)
  const [countdown, setCountdown] = useState<number>(0)
  
  const channelRef = useRef<any>(null)

  // Power-up collection handler
  const handlePowerUpCollect = useCallback(async (powerUpId: string) => {
    if (!channelRef.current) return

    const powerUp = gameState.powerUps[powerUpId]
    if (!powerUp) return

    // Apply power-up effect to current player
    const effect: ActivePowerUp = {
      type: powerUp.type,
      endTime: Date.now() + 10000, // 10 seconds
      multiplier: 1.5
    }

    // Update local state immediately
    setGameState(prev => {
      const newPlayers = { ...prev.players }
      if (newPlayers[currentPlayerId]) {
        newPlayers[currentPlayerId] = {
          ...newPlayers[currentPlayerId],
          activePowerUps: [...newPlayers[currentPlayerId].activePowerUps, effect]
        }
      }

      const newPowerUps = { ...prev.powerUps }
      delete newPowerUps[powerUpId]

      return {
        ...prev,
        players: newPlayers,
        powerUps: newPowerUps
      }
    })

    // Notify other players
    await channelRef.current.publish('power_up_collect', {
      playerId: currentPlayerId,
      powerUpId,
      effect
    })

    // Play collection sound
    if ((window as any).gameAudio) {
      (window as any).gameAudio.playWin()
    }
  }, [gameState.powerUps, currentPlayerId])

  // Spawn power-ups periodically
  useEffect(() => {
    if (gameState.gameStatus !== 'playing') return

    const spawnPowerUp = () => {
      const powerUpTypes: PowerUpData['type'][] = ['speed', 'damage', 'health', 'shield', 'multishot']
      const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
      
      const powerUp: PowerUpData = {
        id: `powerup-${Date.now()}-${Math.random()}`,
        type: randomType,
        position: {
          x: (Math.random() - 0.5) * 16, // Within arena bounds
          y: 1,
          z: (Math.random() - 0.5) * 16
        },
        timestamp: Date.now(),
        duration: 30000 // 30 seconds before despawn
      }

      setGameState(prev => ({
        ...prev,
        powerUps: {
          ...prev.powerUps,
          [powerUp.id]: powerUp
        }
      }))

      // Notify other players
      if (channelRef.current) {
        channelRef.current.publish('power_up_spawn', {
          powerUp
        })
      }
    }

    // Spawn power-ups every 15 seconds
    const interval = setInterval(spawnPowerUp, 15000)
    
    // Initial spawn after 5 seconds
    const initialTimeout = setTimeout(spawnPowerUp, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [gameState.gameStatus])

  // Clean up expired power-ups
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      
      setGameState(prev => {
        const newPowerUps = { ...prev.powerUps }
        let changed = false
        
        Object.keys(newPowerUps).forEach(id => {
          if (now - newPowerUps[id].timestamp > newPowerUps[id].duration) {
            delete newPowerUps[id]
            changed = true
          }
        })

        // Also clean up expired player power-ups
        const newPlayers = { ...prev.players }
        Object.keys(newPlayers).forEach(playerId => {
          const player = newPlayers[playerId]
          const activePowerUps = player.activePowerUps.filter(pu => pu.endTime > now)
          if (activePowerUps.length !== player.activePowerUps.length) {
            newPlayers[playerId] = {
              ...player,
              activePowerUps
            }
            changed = true
          }
        })

        return changed ? {
          ...prev,
          powerUps: newPowerUps,
          players: newPlayers
        } : prev
      })
    }, 1000)

    return () => clearInterval(cleanupInterval)
  }, [])

  // Player movement system
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [event.code]: true }))
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [event.code]: false }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Update player position based on keys
  useEffect(() => {
    if (!currentPlayer || !channelRef.current) return

    const moveSpeed = 0.1
    let moved = false
    const newPosition = { ...currentPlayer.position }

    if (keys['KeyW'] || keys['ArrowUp']) {
      newPosition.z -= moveSpeed
      moved = true
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
      newPosition.z += moveSpeed
      moved = true
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
      newPosition.x -= moveSpeed
      moved = true
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
      newPosition.x += moveSpeed
      moved = true
    }

    // Boundary constraints
    newPosition.x = Math.max(-8, Math.min(8, newPosition.x))
    newPosition.z = Math.max(-8, Math.min(8, newPosition.z))

    if (moved) {
      // Update local state immediately
      setGameState(prev => ({
        ...prev,
        players: {
          ...prev.players,
          [currentPlayerId]: {
            ...prev.players[currentPlayerId],
            position: newPosition
          }
        }
      }))

      // Send movement to other players
      channelRef.current.publish('player_move', {
        playerId: currentPlayerId,
        position: newPosition,
        rotation: currentPlayer.rotation
      })
    }
  }, [keys, currentPlayer, currentPlayerId])

  // Initialize multiplayer connection
  useEffect(() => {
    const setupGame = async () => {
      const channel = blink.realtime.channel(`game-room-${roomId}`)
      channelRef.current = channel
      
      await channel.subscribe({
        userId: currentUser.id,
        metadata: { 
          displayName: playerName,
          status: 'playing',
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`
        }
      })

      // Listen for game messages
      channel.onMessage((message: any) => {
        const gameMsg = message.data as GameMessage
        handleGameMessage(gameMsg)
      })

      // Handle player presence
      channel.onPresence((users: any[]) => {
        const players: Record<string, Player> = {}
        users.forEach(user => {
          players[user.userId] = {
            id: user.userId,
            name: user.metadata?.displayName || 'Anonymous',
            position: { x: Math.random() * 10 - 5, y: 0, z: Math.random() * 10 - 5 },
            rotation: { x: 0, y: 0, z: 0 },
            health: 100,
            maxHealth: 100,
            color: user.metadata?.color || '#FF6B35',
            isDrawing: false,
            penStrokes: [],
            activePowerUps: [],
            score: 0,
            kills: 0,
            deaths: 0
          }
        })
        
        setGameState(prev => ({ ...prev, players }))
      })

      // Add current player
      await channel.publish('player_join', {
        playerId: currentUser.id,
        playerData: {
          name: playerName,
          position: { x: 0, y: 0, z: 0 },
          health: 100
        }
      })
    }

    setupGame()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [roomId, playerName, currentUser.id, handleGameMessage])

  const handleGameMessage = useCallback((message: GameMessage) => {
    switch (message.type) {
      case 'player_move':
        setGameState(prev => ({
          ...prev,
          players: {
            ...prev.players,
            [message.playerId]: {
              ...prev.players[message.playerId],
              position: message.data.position,
              rotation: message.data.rotation
            }
          }
        }))
        break
      
      case 'pen_stroke':
        setGameState(prev => {
          const newPlayers = { ...prev.players }
          
          // Add the stroke to the player
          if (newPlayers[message.playerId]) {
            newPlayers[message.playerId] = {
              ...newPlayers[message.playerId],
              penStrokes: [...(newPlayers[message.playerId]?.penStrokes || []), message.data.stroke]
            }
          }
          
          // Apply damage to hit players
          if (message.data.hitPlayers && message.data.damage) {
            message.data.hitPlayers.forEach((playerId: string) => {
              if (newPlayers[playerId]) {
                newPlayers[playerId] = {
                  ...newPlayers[playerId],
                  health: Math.max(0, newPlayers[playerId].health - message.data.damage)
                }
              }
            })
          }
          
          return { ...prev, players: newPlayers }
        })
        break
        
      case 'player_attack':
        // Handle special attacks
        setGameState(prev => {
          const newPlayers = { ...prev.players }
          if (newPlayers[message.data.targetId]) {
            newPlayers[message.data.targetId] = {
              ...newPlayers[message.data.targetId],
              health: Math.max(0, newPlayers[message.data.targetId].health - message.data.damage)
            }
          }
          return { ...prev, players: newPlayers }
        })
        break

      case 'power_up_spawn':
        setGameState(prev => ({
          ...prev,
          powerUps: {
            ...prev.powerUps,
            [message.data.powerUp.id]: message.data.powerUp
          }
        }))
        break

      case 'power_up_collect':
        setGameState(prev => {
          const newPlayers = { ...prev.players }
          if (newPlayers[message.playerId]) {
            newPlayers[message.playerId] = {
              ...newPlayers[message.playerId],
              activePowerUps: [...newPlayers[message.playerId].activePowerUps, message.data.effect]
            }
          }

          const newPowerUps = { ...prev.powerUps }
          delete newPowerUps[message.data.powerUpId]

          return {
            ...prev,
            players: newPlayers,
            powerUps: newPowerUps
          }
        })
        break
    }
  }, [])

  // Enhanced mouse movement with 3D positioning
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDrawing || !currentStroke || !currentPlayer) return

    // Convert screen coordinates to 3D world coordinates relative to player
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    const point = {
      x: currentPlayer.position.x + x * 3, // Scale drawing area around player
      y: currentPlayer.position.y + y * 2 + 1, // Offset above player
      z: currentPlayer.position.z + Math.sin(Date.now() * 0.01) * 0.5 // Add slight Z variation
    }

    setCurrentStroke(prev => prev ? {
      ...prev,
      points: [...prev.points, point]
    } : null)
  }, [isDrawing, currentStroke, currentPlayer])

  // Collision detection function
  const checkStrokeCollisions = useCallback((stroke: PenStroke) => {
    const strokePoints = stroke.points
    if (strokePoints.length < 2) return []

    const hitPlayers: string[] = []
    
    Object.values(gameState.players).forEach(player => {
      if (player.id === currentPlayerId || player.health <= 0) return

      // Check if any stroke point is near the player
      strokePoints.forEach(point => {
        const distance = Math.sqrt(
          Math.pow(point.x - player.position.x, 2) +
          Math.pow(point.y - player.position.y, 2) +
          Math.pow(point.z - player.position.z, 2)
        )
        
        if (distance < 0.8) { // Hit radius
          if (!hitPlayers.includes(player.id)) {
            hitPlayers.push(player.id)
          }
        }
      })
    })

    return hitPlayers
  }, [gameState.players, currentPlayerId])

  const startDrawing = () => {
    const newStroke: PenStroke = {
      id: `stroke-${Date.now()}`,
      points: [],
      color: gameState.players[currentPlayerId]?.color || '#FF6B35',
      thickness: 0.05,
      timestamp: Date.now()
    }
    
    setCurrentStroke(newStroke)
    setIsDrawing(true)
  }

  const stopDrawing = useCallback(async () => {
    if (!currentStroke || !channelRef.current) return

    setIsDrawing(false)
    
    // Check for collisions and calculate damage
    const hitPlayers = checkStrokeCollisions(currentStroke)
    const damage = Math.min(currentStroke.points.length * 2, 25) // Damage based on stroke length
    
    // Send stroke to other players
    await channelRef.current.publish('pen_stroke', {
      playerId: currentPlayerId,
      stroke: currentStroke,
      hitPlayers,
      damage
    })

    // Apply damage locally for immediate feedback
    if (hitPlayers.length > 0) {
      setGameState(prev => {
        const newPlayers = { ...prev.players }
        hitPlayers.forEach(playerId => {
          if (newPlayers[playerId]) {
            newPlayers[playerId] = {
              ...newPlayers[playerId],
              health: Math.max(0, newPlayers[playerId].health - damage)
            }
          }
        })
        return { ...prev, players: newPlayers }
      })
    }

    setCurrentStroke(null)
  }, [currentStroke, currentPlayerId, checkStrokeCollisions])

  useEffect(() => {
    if (isDrawing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', stopDrawing)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopDrawing)
    }
  }, [isDrawing, handleMouseMove, stopDrawing])

  const currentPlayer = gameState.players[currentPlayerId]
  const otherPlayers = Object.values(gameState.players).filter(p => p.id !== currentPlayerId)

  return (
    <div className="h-screen bg-slate-900 flex">
      {/* Game Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 5, 10], fov: 75 }}
          onMouseDown={startDrawing}
          style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a)' }}
        >
          {/* Enhanced Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={1} 
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[5, 8, 5]} intensity={0.8} color="#FF6B35" />
          <pointLight position={[-5, 8, -5]} intensity={0.8} color="#4ECDC4" />
          <spotLight 
            position={[0, 15, 0]} 
            angle={0.3} 
            penumbra={0.1} 
            intensity={1}
            castShadow
          />

          {/* Arena Floor with better material */}
          <Box args={[20, 0.2, 20]} position={[0, -1, 0]} receiveShadow>
            <meshStandardMaterial 
              color="#2d3748" 
              roughness={0.8}
              metalness={0.2}
            />
          </Box>

          {/* Arena Walls */}
          <Box args={[0.2, 4, 20]} position={[10, 1, 0]}>
            <meshStandardMaterial color="#1a202c" transparent opacity={0.3} />
          </Box>
          <Box args={[0.2, 4, 20]} position={[-10, 1, 0]}>
            <meshStandardMaterial color="#1a202c" transparent opacity={0.3} />
          </Box>
          <Box args={[20, 4, 0.2]} position={[0, 1, 10]}>
            <meshStandardMaterial color="#1a202c" transparent opacity={0.3} />
          </Box>
          <Box args={[20, 4, 0.2]} position={[0, 1, -10]}>
            <meshStandardMaterial color="#1a202c" transparent opacity={0.3} />
          </Box>

          {/* Enhanced Grid Lines */}
          <gridHelper args={[20, 20, '#4ECDC4', '#374151']} position={[0, -0.9, 0]} />

          {/* Render Players */}
          {Object.values(gameState.players).map(player => (
            <PlayerAvatar
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === currentPlayerId}
            />
          ))}

          {/* Render Pen Strokes */}
          {Object.values(gameState.players).map(player =>
            player.penStrokes.map((stroke, index) => {
              // Recent strokes (last 3) have attacking effect
              const isRecentStroke = index >= player.penStrokes.length - 3
              return (
                <PenStrokeRenderer 
                  key={stroke.id} 
                  stroke={stroke} 
                  isAttacking={isRecentStroke}
                />
              )
            })
          )}

          {/* Current Drawing Stroke */}
          {currentStroke && currentStroke.points.length > 1 && (
            <PenStrokeRenderer stroke={currentStroke} isAttacking={true} />
          )}

          {/* Render Power-ups */}
          {Object.values(gameState.powerUps).map(powerUp => (
            <PowerUp
              key={powerUp.id}
              powerUp={powerUp}
              onCollect={handlePowerUpCollect}
            />
          ))}

          {/* POV Camera */}
          {povMode && currentPlayer && <POVCamera player={currentPlayer} />}
          
          {!povMode && <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />}
        </Canvas>

        {/* Game Controls Overlay */}
        <div className="absolute top-4 left-4 space-y-2">
          <Button
            onClick={() => setPovMode(!povMode)}
            variant={povMode ? "default" : "outline"}
            size="sm"
            className="bg-slate-800/80 border-slate-600 text-white"
          >
            POV Mode
          </Button>
          <Button
            onClick={onLeaveGame}
            variant="outline"
            size="sm"
            className="bg-red-800/80 border-red-600 text-white hover:bg-red-700"
          >
            Leave Game
          </Button>
        </div>

        {/* Enhanced Controls Instructions */}
        <div className="absolute bottom-4 left-4 bg-slate-800/90 p-4 rounded-lg text-white text-sm max-w-xs">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Controls
          </h3>
          <div className="space-y-1">
            <p>• <strong>WASD/Arrows:</strong> Move around</p>
            <p>• <strong>Click & Drag:</strong> Draw attack strokes</p>
            <p>• <strong>POV Mode:</strong> First-person camera</p>
            <p>• <strong>Damage:</strong> Based on stroke length</p>
            <p>• <strong>Hit Range:</strong> 0.8 units around players</p>
          </div>
          
          {currentPlayer && (
            <div className="mt-3 pt-2 border-t border-slate-600">
              <p className="text-xs text-slate-300">
                Position: ({currentPlayer.position.x.toFixed(1)}, {currentPlayer.position.z.toFixed(1)})
              </p>
              <p className="text-xs text-slate-300">
                Strokes: {currentPlayer.penStrokes.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Game UI Sidebar */}
      <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
        {/* Room Info */}
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white mb-2">Room: {roomId}</h2>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="bg-green-600 text-white">
              {gameState.gameStatus === 'playing' ? 'Battle Active' : 'Waiting'}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {gameState.gameMode.name}
            </Badge>
          </div>
          
          {/* Game Timer */}
          {gameState.gameMode.duration > 0 && gameState.gameStatus === 'playing' && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-slate-300">
                Time: {Math.max(0, Math.floor((gameState.gameMode.duration * 60 - gameTimer) / 60))}:
                {String(Math.max(0, (gameState.gameMode.duration * 60 - gameTimer) % 60)).padStart(2, '0')}
              </span>
            </div>
          )}
          
          {/* Power-ups Count */}
          <div className="flex items-center gap-2 text-sm mt-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-slate-300">
              Power-ups: {Object.keys(gameState.powerUps).length}
            </span>
          </div>
        </div>

        {/* Players List */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Fighters ({Object.keys(gameState.players).length})
          </h3>
          <div className="space-y-2">
            {Object.values(gameState.players).map(player => (
              <div key={player.id} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="text-white text-sm font-medium">
                    {player.name} {player.id === currentPlayerId && '(You)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <Progress value={player.health} className="w-12 h-2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Battle Stats */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Battle Stats
          </h3>
          {currentPlayer && (
            <div className="space-y-3">
              {/* Health with visual bar */}
              <div>
                <div className="flex justify-between text-sm text-slate-300 mb-1">
                  <span>Health:</span>
                  <span className={currentPlayer.health > 60 ? "text-green-400" : currentPlayer.health > 30 ? "text-yellow-400" : "text-red-400"}>
                    {currentPlayer.health}/100
                  </span>
                </div>
                <Progress value={currentPlayer.health} className="h-2" />
              </div>
              
              {/* Combat Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="bg-slate-700/50 p-2 rounded">
                  <div className="text-orange-400 font-medium">{currentPlayer.penStrokes.length}</div>
                  <div>Strokes</div>
                </div>
                <div className="bg-slate-700/50 p-2 rounded">
                  <div className="text-blue-400 font-medium">
                    {Math.round(Math.sqrt(Math.pow(currentPlayer.position.x, 2) + Math.pow(currentPlayer.position.z, 2)) * 10) / 10}
                  </div>
                  <div>Distance</div>
                </div>
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Status:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentPlayer.isDrawing ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
                  <span className={`text-sm ${currentPlayer.isDrawing ? "text-green-400" : "text-slate-400"}`}>
                    {currentPlayer.isDrawing ? 'Drawing' : 'Ready'}
                  </span>
                </div>
              </div>
              
              {/* Active Power-ups */}
              {currentPlayer.activePowerUps.length > 0 && (
                <div className="pt-2 border-t border-slate-600">
                  <span className="text-sm text-slate-300 block mb-2">Active Power-ups:</span>
                  <div className="space-y-1">
                    {currentPlayer.activePowerUps.map((powerUp, index) => {
                      const timeLeft = Math.max(0, powerUp.endTime - Date.now())
                      return (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 capitalize">{powerUp.type}</span>
                          <span className="text-orange-400">
                            {Math.ceil(timeLeft / 1000)}s
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Alive Players Count */}
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-600">
                {Object.values(gameState.players).filter(p => p.health > 0).length} fighters alive
              </div>
            </div>
          )}
        </div>

        {/* Quick Chat */}
        <div className="flex-1 p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Quick Chat
          </h3>
          <div className="space-y-2">
            <Button size="sm" variant="outline" className="w-full text-left justify-start border-slate-600 text-slate-300">
              Good luck!
            </Button>
            <Button size="sm" variant="outline" className="w-full text-left justify-start border-slate-600 text-slate-300">
              Nice move!
            </Button>
            <Button size="sm" variant="outline" className="w-full text-left justify-start border-slate-600 text-slate-300">
              GG!
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}