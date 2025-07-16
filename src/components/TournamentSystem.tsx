import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Progress } from './ui/progress'
import { Trophy, Users, Clock, Sword, Crown, Star, Target } from 'lucide-react'
import { blink } from '../blink/client'

interface TournamentPlayer {
  id: string
  name: string
  color: string
  wins: number
  losses: number
  score: number
  status: 'waiting' | 'playing' | 'eliminated' | 'winner'
}

interface TournamentMatch {
  id: string
  player1: TournamentPlayer
  player2: TournamentPlayer
  winner?: TournamentPlayer
  status: 'pending' | 'playing' | 'completed'
  round: number
  roomId?: string
}

interface Tournament {
  id: string
  name: string
  status: 'registration' | 'active' | 'completed'
  maxPlayers: number
  currentPlayers: TournamentPlayer[]
  matches: TournamentMatch[]
  currentRound: number
  winner?: TournamentPlayer
  createdAt: number
}

interface TournamentSystemProps {
  currentUser: any
  onJoinMatch: (roomId: string, playerName: string) => void
  onBack: () => void
}

export function TournamentSystem({ currentUser, onJoinMatch, onBack }: TournamentSystemProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [playerName, setPlayerName] = useState(currentUser?.email?.split('@')[0] || '')
  const [newTournamentName, setNewTournamentName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadTournaments()
    
    // Set up real-time tournament updates
    const setupTournamentUpdates = async () => {
      const channel = blink.realtime.channel('tournaments')
      await channel.subscribe({
        userId: currentUser.id,
        metadata: { displayName: playerName }
      })

      channel.onMessage((message: any) => {
        if (message.data.type === 'tournament_update') {
          loadTournaments()
        }
      })
    }

    setupTournamentUpdates()
  }, [currentUser.id, playerName])

  const loadTournaments = async () => {
    try {
      // Load tournaments from database
      const tournamentsData = await blink.db.tournaments.list({
        where: { status: ['registration', 'active'] },
        orderBy: { createdAt: 'desc' }
      })
      
      setTournaments(tournamentsData.map(t => ({
        ...t,
        currentPlayers: JSON.parse(t.currentPlayers || '[]'),
        matches: JSON.parse(t.matches || '[]')
      })))
    } catch (error) {
      console.error('Failed to load tournaments:', error)
    }
  }

  const createTournament = async () => {
    if (!newTournamentName.trim()) return

    const tournament: Tournament = {
      id: `tournament-${Date.now()}`,
      name: newTournamentName,
      status: 'registration',
      maxPlayers: 8,
      currentPlayers: [],
      matches: [],
      currentRound: 1,
      createdAt: Date.now()
    }

    try {
      await blink.db.tournaments.create({
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        maxPlayers: tournament.maxPlayers,
        currentPlayers: JSON.stringify(tournament.currentPlayers),
        matches: JSON.stringify(tournament.matches),
        currentRound: tournament.currentRound,
        createdAt: tournament.createdAt,
        createdBy: currentUser.id
      })

      // Notify other users
      const channel = blink.realtime.channel('tournaments')
      await channel.publish('tournament_update', { type: 'tournament_created', tournament })

      setNewTournamentName('')
      setShowCreateForm(false)
      loadTournaments()
    } catch (error) {
      console.error('Failed to create tournament:', error)
    }
  }

  const joinTournament = async (tournament: Tournament) => {
    if (tournament.currentPlayers.length >= tournament.maxPlayers) return
    if (tournament.currentPlayers.some(p => p.id === currentUser.id)) return

    const newPlayer: TournamentPlayer = {
      id: currentUser.id,
      name: playerName,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      wins: 0,
      losses: 0,
      score: 0,
      status: 'waiting'
    }

    const updatedPlayers = [...tournament.currentPlayers, newPlayer]

    try {
      await blink.db.tournaments.update(tournament.id, {
        currentPlayers: JSON.stringify(updatedPlayers)
      })

      // Notify other users
      const channel = blink.realtime.channel('tournaments')
      await channel.publish('tournament_update', { 
        type: 'player_joined', 
        tournamentId: tournament.id,
        player: newPlayer
      })

      loadTournaments()
    } catch (error) {
      console.error('Failed to join tournament:', error)
    }
  }

  const startTournament = async (tournament: Tournament) => {
    if (tournament.currentPlayers.length < 2) return

    // Generate first round matches
    const players = [...tournament.currentPlayers]
    const matches: TournamentMatch[] = []

    // Shuffle players for random matchups
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]]
    }

    // Create matches for first round
    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 < players.length) {
        matches.push({
          id: `match-${Date.now()}-${i}`,
          player1: players[i],
          player2: players[i + 1],
          status: 'pending',
          round: 1,
          roomId: `tournament-${tournament.id}-match-${matches.length + 1}`
        })
      }
    }

    try {
      await blink.db.tournaments.update(tournament.id, {
        status: 'active',
        matches: JSON.stringify(matches),
        currentRound: 1
      })

      // Notify players
      const channel = blink.realtime.channel('tournaments')
      await channel.publish('tournament_update', { 
        type: 'tournament_started', 
        tournamentId: tournament.id
      })

      loadTournaments()
    } catch (error) {
      console.error('Failed to start tournament:', error)
    }
  }

  const generateNextRound = async (tournament: Tournament) => {
    const completedMatches = tournament.matches.filter(m => m.status === 'completed' && m.round === tournament.currentRound)
    const winners = completedMatches.map(m => m.winner!).filter(Boolean)

    if (winners.length < 2) return

    const nextRoundMatches: TournamentMatch[] = []
    
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextRoundMatches.push({
          id: `match-${Date.now()}-${i}`,
          player1: winners[i],
          player2: winners[i + 1],
          status: 'pending',
          round: tournament.currentRound + 1,
          roomId: `tournament-${tournament.id}-r${tournament.currentRound + 1}-match-${nextRoundMatches.length + 1}`
        })
      }
    }

    const allMatches = [...tournament.matches, ...nextRoundMatches]

    try {
      await blink.db.tournaments.update(tournament.id, {
        matches: JSON.stringify(allMatches),
        currentRound: tournament.currentRound + 1
      })

      loadTournaments()
    } catch (error) {
      console.error('Failed to generate next round:', error)
    }
  }

  const getCurrentUserMatch = (tournament: Tournament) => {
    return tournament.matches.find(match => 
      (match.player1.id === currentUser.id || match.player2.id === currentUser.id) &&
      match.status === 'pending' &&
      match.round === tournament.currentRound
    )
  }

  const renderTournamentBracket = (tournament: Tournament) => {
    const rounds = Math.max(...tournament.matches.map(m => m.round))
    
    return (
      <div className="space-y-6">
        {Array.from({ length: rounds }, (_, roundIndex) => {
          const roundNumber = roundIndex + 1
          const roundMatches = tournament.matches.filter(m => m.round === roundNumber)
          
          return (
            <div key={roundNumber} className="space-y-3">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                {roundNumber === rounds && roundMatches.length === 1 ? (
                  <>
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Final
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5 text-orange-500" />
                    Round {roundNumber}
                  </>
                )}
              </h4>
              
              <div className="grid gap-3">
                {roundMatches.map(match => (
                  <Card key={match.id} className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: match.player1.color }}
                            />
                            <span className={`text-sm ${match.winner?.id === match.player1.id ? 'text-green-400 font-bold' : 'text-white'}`}>
                              {match.player1.name}
                            </span>
                          </div>
                          
                          <span className="text-slate-400">vs</span>
                          
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: match.player2.color }}
                            />
                            <span className={`text-sm ${match.winner?.id === match.player2.id ? 'text-green-400 font-bold' : 'text-white'}`}>
                              {match.player2.name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={match.status === 'completed' ? 'default' : match.status === 'playing' ? 'secondary' : 'outline'}
                            className={
                              match.status === 'completed' ? 'bg-green-600' :
                              match.status === 'playing' ? 'bg-orange-600' : 'bg-slate-600'
                            }
                          >
                            {match.status === 'completed' ? 'Completed' :
                             match.status === 'playing' ? 'Playing' : 'Pending'}
                          </Badge>
                          
                          {match.status === 'pending' && 
                           (match.player1.id === currentUser.id || match.player2.id === currentUser.id) && (
                            <Button
                              size="sm"
                              onClick={() => onJoinMatch(match.roomId!, playerName)}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Join Match
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Tournament System
            </h1>
            <p className="text-slate-300">Compete in organized brackets and climb the ranks</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-green-600 hover:bg-green-700"
            >
              Create Tournament
            </Button>
            <Button
              onClick={onBack}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Back to Lobby
            </Button>
          </div>
        </div>

        {/* Create Tournament Form */}
        {showCreateForm && (
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Create New Tournament</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Tournament Name
                </label>
                <Input
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="Enter tournament name"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={createTournament}
                  disabled={!newTournamentName.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Tournament
                </Button>
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedTournament ? (
          /* Tournament List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(tournament => (
              <Card 
                key={tournament.id} 
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer"
                onClick={() => setSelectedTournament(tournament)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">{tournament.name}</CardTitle>
                    <Badge 
                      variant={tournament.status === 'registration' ? 'secondary' : 'default'}
                      className={tournament.status === 'registration' ? 'bg-blue-600' : 'bg-green-600'}
                    >
                      {tournament.status === 'registration' ? 'Open' : 'Active'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Players:</span>
                    <span className="text-white">
                      {tournament.currentPlayers.length}/{tournament.maxPlayers}
                    </span>
                  </div>
                  
                  <Progress 
                    value={(tournament.currentPlayers.length / tournament.maxPlayers) * 100} 
                    className="h-2"
                  />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Status:</span>
                    <span className={tournament.status === 'registration' ? 'text-blue-400' : 'text-green-400'}>
                      {tournament.status === 'registration' ? 'Registration Open' : `Round ${tournament.currentRound}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Created:</span>
                    <span className="text-slate-400">
                      {new Date(tournament.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {tournament.status === 'registration' && 
                   !tournament.currentPlayers.some(p => p.id === currentUser.id) && 
                   tournament.currentPlayers.length < tournament.maxPlayers && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        joinTournament(tournament)
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      size="sm"
                    >
                      Join Tournament
                    </Button>
                  )}
                  
                  {tournament.currentPlayers.some(p => p.id === currentUser.id) && (
                    <Badge className="w-full justify-center bg-green-600">
                      Joined
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {tournaments.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">No Active Tournaments</h3>
                <p className="text-slate-500">Create the first tournament to get started!</p>
              </div>
            )}
          </div>
        ) : (
          /* Tournament Details */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{selectedTournament.name}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <span>Players: {selectedTournament.currentPlayers.length}/{selectedTournament.maxPlayers}</span>
                  <span>Round: {selectedTournament.currentRound}</span>
                  <Badge className={selectedTournament.status === 'registration' ? 'bg-blue-600' : 'bg-green-600'}>
                    {selectedTournament.status === 'registration' ? 'Registration' : 'Active'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-3">
                {selectedTournament.status === 'registration' && 
                 selectedTournament.currentPlayers.length >= 2 && (
                  <Button
                    onClick={() => startTournament(selectedTournament)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Start Tournament
                  </Button>
                )}
                
                <Button
                  onClick={() => setSelectedTournament(null)}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Back to List
                </Button>
              </div>
            </div>

            {selectedTournament.status === 'registration' ? (
              /* Registration Phase */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Registered Players
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTournament.currentPlayers.map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">#{index + 1}</span>
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: player.color }}
                            />
                            <span className="text-white">{player.name}</span>
                          </div>
                          {player.id === currentUser.id && (
                            <Badge className="bg-green-600">You</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Tournament Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-300">
                    <div className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <span>Single elimination bracket format</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <span>Winners advance to the next round</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <span>Final match determines the champion</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <span>All matches use Deathmatch mode</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Active Tournament Bracket */
              <div>
                {renderTournamentBracket(selectedTournament)}
                
                {/* Current User's Next Match */}
                {(() => {
                  const userMatch = getCurrentUserMatch(selectedTournament)
                  if (userMatch) {
                    return (
                      <Card className="bg-orange-900/20 border-orange-600 mt-6">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Sword className="w-5 h-5 text-orange-500" />
                            Your Next Match
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-white">
                                {userMatch.player1.id === currentUser.id ? userMatch.player1.name : userMatch.player2.name} (You)
                              </span>
                              <span className="text-slate-400">vs</span>
                              <span className="text-white">
                                {userMatch.player1.id === currentUser.id ? userMatch.player2.name : userMatch.player1.name}
                              </span>
                            </div>
                            <Button
                              onClick={() => onJoinMatch(userMatch.roomId!, playerName)}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Join Match
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  }
                  return null
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}