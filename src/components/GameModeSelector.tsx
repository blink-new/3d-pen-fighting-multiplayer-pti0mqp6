import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Sword, Target, Clock, Users, Zap, Crown } from 'lucide-react'

export interface GameMode {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  maxPlayers: number
  duration: number // in minutes, 0 = unlimited
  features: string[]
  color: string
}

const GAME_MODES: GameMode[] = [
  {
    id: 'deathmatch',
    name: 'Deathmatch',
    description: 'Classic free-for-all combat. Last fighter standing wins!',
    icon: <Sword className="w-6 h-6" />,
    maxPlayers: 8,
    duration: 0,
    features: ['Unlimited time', 'Power-ups enabled', 'Respawn system'],
    color: '#ff4444'
  },
  {
    id: 'target_practice',
    name: 'Target Practice',
    description: 'Hit moving targets to score points. Highest score wins!',
    icon: <Target className="w-6 h-6" />,
    maxPlayers: 4,
    duration: 5,
    features: ['5 minute rounds', 'Moving targets', 'Accuracy scoring'],
    color: '#4169e1'
  },
  {
    id: 'time_attack',
    name: 'Time Attack',
    description: 'Survive waves of challenges within the time limit!',
    icon: <Clock className="w-6 h-6" />,
    maxPlayers: 2,
    duration: 3,
    features: ['3 minute rounds', 'Wave system', 'Bonus multipliers'],
    color: '#ffa500'
  },
  {
    id: 'team_battle',
    name: 'Team Battle',
    description: 'Work together in teams to defeat the opposing side!',
    icon: <Users className="w-6 h-6" />,
    maxPlayers: 6,
    duration: 10,
    features: ['Team coordination', 'Shared power-ups', 'Strategy focused'],
    color: '#00ff00'
  },
  {
    id: 'lightning_round',
    name: 'Lightning Round',
    description: 'Fast-paced combat with rapid power-up spawns!',
    icon: <Zap className="w-6 h-6" />,
    maxPlayers: 4,
    duration: 2,
    features: ['2 minute rounds', 'Frequent power-ups', 'High intensity'],
    color: '#ff69b4'
  },
  {
    id: 'king_of_hill',
    name: 'King of the Hill',
    description: 'Control the center zone to accumulate points and win!',
    icon: <Crown className="w-6 h-6" />,
    maxPlayers: 6,
    duration: 8,
    features: ['Zone control', 'Point accumulation', 'Strategic positioning'],
    color: '#4ecdc4'
  }
]

interface GameModeSelectorProps {
  onSelectMode: (mode: GameMode) => void
  onBack: () => void
}

export function GameModeSelector({ onSelectMode, onBack }: GameModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)

  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode)
  }

  const handleConfirm = () => {
    if (selectedMode) {
      onSelectMode(selectedMode)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Choose Game Mode</h1>
          <p className="text-slate-300">Select your preferred battle style</p>
        </div>

        {/* Game Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {GAME_MODES.map((mode) => (
            <Card
              key={mode.id}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                selectedMode?.id === mode.id
                  ? 'ring-2 ring-orange-500 bg-slate-800/80'
                  : 'bg-slate-800/50 hover:bg-slate-800/70'
              } border-slate-700 backdrop-blur-sm`}
              onClick={() => handleSelectMode(mode)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${mode.color}20`, color: mode.color }}
                  >
                    {mode.icon}
                  </div>
                  <CardTitle className="text-white text-lg">{mode.name}</CardTitle>
                </div>
                <p className="text-slate-400 text-sm">{mode.description}</p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Game Info */}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Players:</span>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {mode.maxPlayers} max
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Duration:</span>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {mode.duration === 0 ? 'Unlimited' : `${mode.duration} min`}
                    </Badge>
                  </div>

                  {/* Features */}
                  <div>
                    <span className="text-slate-300 text-sm block mb-2">Features:</span>
                    <div className="space-y-1">
                      {mode.features.map((feature, index) => (
                        <div key={index} className="text-xs text-slate-400 flex items-center gap-1">
                          <div className="w-1 h-1 bg-slate-500 rounded-full" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Mode Details */}
        {selectedMode && (
          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${selectedMode.color}20`, color: selectedMode.color }}
                >
                  {selectedMode.icon}
                </div>
                {selectedMode.name} Selected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">{selectedMode.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-white">{selectedMode.maxPlayers}</div>
                  <div className="text-xs text-slate-400">Max Players</div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-white">
                    {selectedMode.duration === 0 ? '∞' : selectedMode.duration}
                  </div>
                  <div className="text-xs text-slate-400">
                    {selectedMode.duration === 0 ? 'Unlimited' : 'Minutes'}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-white">{selectedMode.features.length}</div>
                  <div className="text-xs text-slate-400">Features</div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold" style={{ color: selectedMode.color }}>●</div>
                  <div className="text-xs text-slate-400">Theme Color</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Back to Lobby
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!selectedMode}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8"
          >
            Start {selectedMode?.name || 'Game'}
          </Button>
        </div>
      </div>
    </div>
  )
}