import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Box, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Eye, Users, Clock, Trophy, ArrowLeft } from 'lucide-react'
import { blink } from '../blink/client'
import type { Player, GameState, PenStroke } from '../types/game'

interface SpectatorModeProps {
  roomId: string
  onBack: () => void
}

// Spectator Camera that follows the action
function SpectatorCamera({ players }: { players: Record<string, Player> }) {
  const { camera } = useThree()
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null)
  
  useFrame(() => {
    const playerList = Object.values(players)
    if (playerList.length === 0) return
    
    if (!targetPlayer || !players[targetPlayer]) {
      // Auto-follow the player with lowest health (most action)
      const activePlayer = playerList
        .filter(p => p.health > 0)
        .sort((a, b) => a.health - b.health)[0]
      
      if (activePlayer) {
        setTargetPlayer(activePlayer.id)
      }
    }
    
    if (targetPlayer && players[targetPlayer]) {
      const player = players[targetPlayer]
      const targetPos = new THREE.Vector3(
        player.position.x,
        player.position.y + 3,
        player.position.z + 5
      )
      
      camera.position.lerp(targetPos, 0.02)
      camera.lookAt(player.position.x, player.position.y, player.position.z)
    }
  })
  
  return null
}

// Enhanced Player Renderer for Spectators
function SpectatorPlayerRenderer({ player }: { player: Player }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.set(player.position.x, player.position.y, player.position.z)
      
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
  })

  return (
    <group>
      {/* Player Sphere */}
      <Sphere ref={meshRef} args={[0.5]} position={[player.position.x, player.position.y, player.position.z]}>
        <meshStandardMaterial 
          color={player.color} 
          emissive={player.isDrawing ? player.color : '#000000'}
          emissiveIntensity={player.isDrawing ? 0.5 : 0}
          transparent
          opacity={player.health > 0 ? 1 : 0.3}
        />
      </Sphere>
      
      {/* Player Name with Health */}
      <Text
        position={[player.position.x, player.position.y + 1.2, player.position.z]}
        fontSize={0.25}
        color={player.health > 0 ? "white" : "#666666"}
        anchorX="center"
        anchorY="middle"
      >
        {player.name} ({player.health}HP)
      </Text>
      
      {/* Health Bar */}
      <Box 
        args={[1, 0.1, 0.02]} 
        position={[player.position.x, player.position.y + 0.8, player.position.z]}
      >
        <meshStandardMaterial color="#333333" transparent opacity={0.7} />
      </Box>
      
      <Box 
        args={[player.health / 100, 0.08, 0.03]} 
        position={[player.position.x - (1 - player.health / 100) / 2, player.position.y + 0.8, player.position.z]}
      >
        <meshStandardMaterial 
          color={player.health > 60 ? "#00ff00" : player.health > 30 ? "#ffff00" : "#ff0000"} 
        />
      </Box>
      
      {/* Death indicator */}
      {player.health <= 0 && (
        <Text
          position={[player.position.x, player.position.y + 0.5, player.position.z]}
          fontSize={0.3}
          color="#ff4444"
          anchorX="center"
          anchorY="middle"
        >
          💀
        </Text>
      )}
    </group>
  )
}

// Pen Stroke Renderer for Spectators
function SpectatorStrokeRenderer({ stroke }: { stroke: PenStroke }) {
  if (stroke.points.length < 2) return null

  const points = stroke.points.map(p => new THREE.Vector3(p.x, p.y, p.z))
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, points.length * 2, stroke.thickness, 8, false)
  
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color={stroke.color} 
        emissive={stroke.color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

export function SpectatorMode({ roomId, onBack }: SpectatorModeProps) {
  const [gameState, setGameState] = useState<GameState>({
    players: {},
    gameStatus: 'waiting',
    gameMode: {
      id: 'spectator',
      name: 'Spectator Mode',
      duration: 0,
      maxPlayers: 8
    },
    powerUps: {},
    roomId,
    leaderboard: []
  })
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [spectatorCount, setSpectatorCount] = useState(0)
  
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const setupSpectator = async () => {
      const channel = blink.realtime.channel(`game-room-${roomId}`)
      channelRef.current = channel
      
      await channel.subscribe({
        userId: `spectator-${Date.now()}`,
        metadata: { 
          displayName: 'Spectator',
          status: 'spectating'
        }
      })

      // Listen for game messages
      channel.onMessage((message: any) => {
        const gameMsg = message.data
        handleGameMessage(gameMsg)
      })

      // Handle presence for spectator count
      channel.onPresence((users: any[]) => {
        const players: Record<string, Player> = {}
        let spectators = 0
        
        users.forEach(user => {
          if (user.metadata?.status === 'spectating') {
            spectators++
          } else {
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
          }
        })
        
        setGameState(prev => ({ ...prev, players }))
        setSpectatorCount(spectators)
      })
    }

    setupSpectator()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [roomId])

  const handleGameMessage = (message: any) => {
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
    }
  }

  const alivePlayers = Object.values(gameState.players).filter(p => p.health > 0)
  const deadPlayers = Object.values(gameState.players).filter(p => p.health <= 0)

  return (
    <div className="h-screen bg-slate-900 flex">
      {/* Spectator Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 8, 12], fov: 75 }}
          style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a)' }}
        >
          {/* Enhanced Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight position={[5, 8, 5]} intensity={0.8} color="#FF6B35" />
          <pointLight position={[-5, 8, -5]} intensity={0.8} color="#4ECDC4" />

          {/* Arena */}
          <Box args={[20, 0.2, 20]} position={[0, -1, 0]} receiveShadow>
            <meshStandardMaterial color="#2d3748" roughness={0.8} metalness={0.2} />
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

          <gridHelper args={[20, 20, '#4ECDC4', '#374151']} position={[0, -0.9, 0]} />

          {/* Render Players */}
          {Object.values(gameState.players).map(player => (
            <SpectatorPlayerRenderer key={player.id} player={player} />
          ))}

          {/* Render Pen Strokes */}
          {Object.values(gameState.players).map(player =>
            player.penStrokes.map(stroke => (
              <SpectatorStrokeRenderer key={stroke.id} stroke={stroke} />
            ))
          )}

          {/* Spectator Camera */}
          <SpectatorCamera players={gameState.players} />
          
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>

        {/* Spectator Controls */}
        <div className="absolute top-4 left-4 space-y-2">
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="bg-slate-800/80 border-slate-600 text-white hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
        </div>

        {/* Spectator Info */}
        <div className="absolute top-4 right-4 bg-slate-800/90 p-3 rounded-lg text-white">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-blue-400" />
            <span>Spectating Room: {roomId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Users className="w-4 h-4 text-green-400" />
            <span>{spectatorCount} spectators watching</span>
          </div>
        </div>
      </div>

      {/* Spectator Sidebar */}
      <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
        {/* Room Info */}
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            Spectator Mode
          </h2>
          <div className="text-sm text-slate-300">
            <p>Room: {roomId}</p>
            <p>Spectators: {spectatorCount}</p>
          </div>
        </div>

        {/* Live Players */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Alive ({alivePlayers.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {alivePlayers.map(player => (
              <div 
                key={player.id} 
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  selectedPlayer === player.id ? 'bg-slate-600' : 'bg-slate-700 hover:bg-slate-600'
                }`}
                onClick={() => setSelectedPlayer(player.id)}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="text-white text-sm font-medium">{player.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-green-400">{player.health}HP</div>
                  <div className="text-xs text-slate-400">{player.penStrokes.length} strokes</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eliminated Players */}
        {deadPlayers.length > 0 && (
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-red-400" />
              Eliminated ({deadPlayers.length})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {deadPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full opacity-50"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="text-slate-400 text-sm">{player.name}</span>
                  </div>
                  <div className="text-xs text-red-400">💀</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Battle Stats */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-3">Battle Stats</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-700/50 p-2 rounded text-center">
              <div className="text-lg font-bold text-green-400">{alivePlayers.length}</div>
              <div className="text-slate-400">Alive</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded text-center">
              <div className="text-lg font-bold text-red-400">{deadPlayers.length}</div>
              <div className="text-slate-400">Eliminated</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded text-center">
              <div className="text-lg font-bold text-orange-400">
                {Object.values(gameState.players).reduce((sum, p) => sum + p.penStrokes.length, 0)}
              </div>
              <div className="text-slate-400">Total Strokes</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded text-center">
              <div className="text-lg font-bold text-blue-400">{spectatorCount}</div>
              <div className="text-slate-400">Spectators</div>
            </div>
          </div>
        </div>

        {/* Selected Player Details */}
        {selectedPlayer && gameState.players[selectedPlayer] && (
          <div className="p-4 flex-1">
            <h3 className="text-lg font-semibold text-white mb-3">Player Focus</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: gameState.players[selectedPlayer].color }}
                />
                <span className="text-white font-medium">
                  {gameState.players[selectedPlayer].name}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">Health:</span>
                  <span className={gameState.players[selectedPlayer].health > 60 ? "text-green-400" : 
                    gameState.players[selectedPlayer].health > 30 ? "text-yellow-400" : "text-red-400"}>
                    {gameState.players[selectedPlayer].health}/100
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Strokes:</span>
                  <span className="text-orange-400">
                    {gameState.players[selectedPlayer].penStrokes.length}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Status:</span>
                  <span className={gameState.players[selectedPlayer].health > 0 ? "text-green-400" : "text-red-400"}>
                    {gameState.players[selectedPlayer].health > 0 ? 'Fighting' : 'Eliminated'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-300">Position:</span>
                  <span className="text-slate-400 text-xs">
                    ({gameState.players[selectedPlayer].position.x.toFixed(1)}, {gameState.players[selectedPlayer].position.z.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}