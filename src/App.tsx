import { useState, useEffect } from 'react'
import { GameLobby } from './components/GameLobby'
import { GameArena } from './components/GameArena'
import { GameModeSelector, GameMode } from './components/GameModeSelector'
import { SoundManager } from './components/SoundManager'
import { SpectatorMode } from './components/SpectatorMode'
import { TournamentSystem } from './components/TournamentSystem'
import { Leaderboard } from './components/Leaderboard'
import { blink } from './blink/client'

type GameState = 'lobby' | 'mode-select' | 'playing' | 'spectator' | 'tournaments' | 'leaderboard'

function App() {
  const [gameState, setGameState] = useState<GameState>('lobby')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentRoom, setCurrentRoom] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setCurrentUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const handleJoinGame = async (roomId: string, name: string) => {
    setCurrentRoom(roomId)
    setPlayerName(name)
    setGameState('mode-select')
  }

  const handleSelectGameMode = (mode: GameMode) => {
    setSelectedGameMode(mode)
    setGameState('playing')
  }

  const handleBackToLobby = () => {
    setGameState('lobby')
    setCurrentRoom('')
    setPlayerName('')
    setSelectedGameMode(null)
  }

  const handleLeaveGame = () => {
    setCurrentRoom('')
    setPlayerName('')
    setSelectedGameMode(null)
    setGameState('lobby')
  }

  const handleNavigateToSpectator = (roomId: string) => {
    setCurrentRoom(roomId)
    setGameState('spectator')
  }

  const handleNavigateToTournaments = () => {
    setGameState('tournaments')
  }

  const handleNavigateToLeaderboard = () => {
    setGameState('leaderboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading 3D Pen Fighter...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">3D Pen Fighter</h1>
          <p className="text-slate-300 mb-8">Please sign in to start battling!</p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Sign In to Play
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <SoundManager enabled={soundEnabled} />
      
      {gameState === 'lobby' && (
        <GameLobby 
          onJoinGame={handleJoinGame}
          currentUser={currentUser}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onNavigateToSpectator={handleNavigateToSpectator}
          onNavigateToTournaments={handleNavigateToTournaments}
          onNavigateToLeaderboard={handleNavigateToLeaderboard}
        />
      )}
      
      {gameState === 'mode-select' && (
        <GameModeSelector
          onSelectMode={handleSelectGameMode}
          onBack={handleBackToLobby}
        />
      )}
      
      {gameState === 'playing' && selectedGameMode && (
        <GameArena
          roomId={currentRoom}
          playerName={playerName}
          currentUser={currentUser}
          gameMode={selectedGameMode}
          onLeaveGame={handleLeaveGame}
        />
      )}
      
      {gameState === 'spectator' && (
        <SpectatorMode
          roomId={currentRoom}
          onBack={handleBackToLobby}
        />
      )}
      
      {gameState === 'tournaments' && (
        <TournamentSystem
          currentUser={currentUser}
          onJoinMatch={handleJoinGame}
          onBack={handleBackToLobby}
        />
      )}
      
      {gameState === 'leaderboard' && (
        <Leaderboard
          currentUser={currentUser}
          onBack={handleBackToLobby}
        />
      )}
    </div>
  )
}

export default App