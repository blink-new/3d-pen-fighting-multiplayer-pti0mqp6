export interface Player {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  health: number
  maxHealth: number
  color: string
  isDrawing: boolean
  penStrokes: PenStroke[]
  activePowerUps: ActivePowerUp[]
  score: number
  kills: number
  deaths: number
  team?: string
}

export interface ActivePowerUp {
  type: 'speed' | 'damage' | 'health' | 'shield' | 'multishot'
  endTime: number
  multiplier: number
}

export interface PenStroke {
  id: string
  points: { x: number; y: number; z: number }[]
  color: string
  thickness: number
  timestamp: number
}

export interface GameState {
  players: Record<string, Player>
  gameStatus: 'waiting' | 'playing' | 'finished' | 'countdown'
  gameMode: {
    id: string
    name: string
    duration: number
    maxPlayers: number
  }
  powerUps: Record<string, PowerUpData>
  startTime?: number
  endTime?: number
  winner?: string
  roomId: string
  leaderboard: LeaderboardEntry[]
}

export interface PowerUpData {
  id: string
  type: 'speed' | 'damage' | 'health' | 'shield' | 'multishot'
  position: { x: number; y: number; z: number }
  timestamp: number
  duration: number
}

export interface LeaderboardEntry {
  playerId: string
  playerName: string
  score: number
  kills: number
  deaths: number
}

export interface GameMessage {
  type: 'player_move' | 'pen_stroke' | 'player_attack' | 'game_state' | 'player_join' | 'player_leave' | 'power_up_spawn' | 'power_up_collect' | 'game_mode_change' | 'countdown_start'
  playerId: string
  data: any
  timestamp: number
}