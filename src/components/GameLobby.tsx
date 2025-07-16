import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Users, Gamepad2, Wifi, Volume2, VolumeX, Eye, Trophy, Target } from 'lucide-react'
import { blink } from '../blink/client'
import type { Player } from '../types/game'

interface GameLobbyProps {
  onJoinGame: (roomId: string, playerName: string) => void
  currentUser: any
  soundEnabled: boolean
  onToggleSound: () => void
  onNavigateToSpectator: (roomId: string) => void
  onNavigateToTournaments: () => void
  onNavigateToLeaderboard: () => void
}

export function GameLobby({ onJoinGame, currentUser, soundEnabled, onToggleSound, onNavigateToSpectator, onNavigateToTournaments, onNavigateToLeaderboard }: GameLobbyProps) {
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState(currentUser?.email?.split('@')[0] || '')
  const [isConnecting, setIsConnecting] = useState(false)
  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([])

  useEffect(() => {
    // Subscribe to lobby presence
    const setupLobby = async () => {
      const channel = blink.realtime.channel('game-lobby')
      await channel.subscribe({
        userId: currentUser.id,
        metadata: { 
          displayName: playerName,
          status: 'in_lobby'
        }
      })

      channel.onPresence((users) => {
        const players = users.map(user => ({
          id: user.userId,
          name: user.metadata?.displayName || 'Anonymous',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          health: 100,
          maxHealth: 100,
          color: '#FF6B35',
          isDrawing: false,
          penStrokes: [],
          activePowerUps: [],
          score: 0,
          kills: 0,
          deaths: 0
        }))
        setOnlinePlayers(players)
      })
    }

    if (currentUser) {
      setupLobby()
    }
  }, [currentUser, playerName])

  const handleJoinGame = async () => {
    if (!roomId.trim() || !playerName.trim()) return
    
    setIsConnecting(true)
    try {
      await onJoinGame(roomId, playerName)
    } catch (error) {
      console.error('Failed to join game:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomId(id)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Sound Toggle */}
      <div className="absolute top-4 right-4">
        <Button
          onClick={onToggleSound}
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>
      
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Join Game Panel */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-orange-500" />
              3D Pen Fighter
            </CardTitle>
            <p className="text-slate-400">Join or create a multiplayer battle arena</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Player Name
                </label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your fighter name"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Room ID
                </label>
                <div className="flex gap-2">
                  <Input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="Enter room ID"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <Button
                    onClick={generateRoomId}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <Button
              onClick={handleJoinGame}
              disabled={!roomId.trim() || !playerName.trim() || isConnecting}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </div>
              ) : (
                'Enter Battle Arena'
              )}
            </Button>

            <div className="text-center text-sm text-slate-400">
              <p>Share the Room ID with friends to battle together!</p>
            </div>
          </CardContent>
        </Card>

        {/* Online Players Panel */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              Online Fighters ({onlinePlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {onlinePlayers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Wifi className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No fighters online</p>
                  <p className="text-sm">Be the first to join!</p>
                </div>
              ) : (
                onlinePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full bg-green-500"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-white font-medium">{player.name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-slate-600 text-slate-300">
                      Ready
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Panel */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-purple-500" />
              Game Modes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={onNavigateToTournaments}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Join Tournament
            </Button>
            
            <Button
              onClick={onNavigateToLeaderboard}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              View Leaderboard
            </Button>
            
            <div className="pt-2 border-t border-slate-600">
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Spectate Game
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Room ID"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm"
                />
                <Button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Room ID"]') as HTMLInputElement
                    if (input?.value.trim()) {
                      onNavigateToSpectator(input.value.trim().toUpperCase())
                    }
                  }}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <Eye className="w-4 h-4" />
                  Watch
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}