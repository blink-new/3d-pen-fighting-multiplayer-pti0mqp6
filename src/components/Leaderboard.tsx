import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Trophy, Target, Sword, Crown, Star, TrendingUp, Clock, Users } from 'lucide-react'
import { blink } from '../blink/client'

interface PlayerStats {
  userId: string
  playerName: string
  totalGames: number
  totalWins: number
  totalLosses: number
  totalKills: number
  totalDeaths: number
  totalStrokes: number
  tournamentsJoined: number
  tournamentsWon: number
  highestStreak: number
  currentStreak: number
  rating: number
  lastPlayed: number
  winRate: number
  kdRatio: number
}

interface LeaderboardProps {
  currentUser: any
  onBack: () => void
}

export function Leaderboard({ currentUser, onBack }: LeaderboardProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [currentUserStats, setCurrentUserStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('rating')

  useEffect(() => {
    loadLeaderboard()
  }, [currentUser.id, loadLeaderboard])

  const loadLeaderboard = useCallback(async () => {
    setLoading(true)
    try {
      // Since we can't create new tables, we'll simulate the data structure
      // In a real implementation, this would query the actual database
      
      // Mock data for demonstration - in production this would come from the database
      const mockStats: PlayerStats[] = [
        {
          userId: currentUser.id,
          playerName: currentUser.email?.split('@')[0] || 'You',
          totalGames: 15,
          totalWins: 12,
          totalLosses: 3,
          totalKills: 45,
          totalDeaths: 18,
          totalStrokes: 234,
          tournamentsJoined: 3,
          tournamentsWon: 1,
          highestStreak: 8,
          currentStreak: 4,
          rating: 1250,
          lastPlayed: Date.now() - 3600000, // 1 hour ago
          winRate: 80,
          kdRatio: 2.5
        },
        {
          userId: 'player2',
          playerName: 'PenMaster',
          totalGames: 28,
          totalWins: 22,
          totalLosses: 6,
          totalKills: 78,
          totalDeaths: 25,
          totalStrokes: 445,
          tournamentsJoined: 5,
          tournamentsWon: 2,
          highestStreak: 12,
          currentStreak: 0,
          rating: 1380,
          lastPlayed: Date.now() - 1800000, // 30 min ago
          winRate: 78.6,
          kdRatio: 3.1
        },
        {
          userId: 'player3',
          playerName: 'StrokeKing',
          totalGames: 42,
          totalWins: 35,
          totalLosses: 7,
          totalKills: 125,
          totalDeaths: 32,
          totalStrokes: 678,
          tournamentsJoined: 8,
          tournamentsWon: 3,
          highestStreak: 15,
          currentStreak: 7,
          rating: 1450,
          lastPlayed: Date.now() - 900000, // 15 min ago
          winRate: 83.3,
          kdRatio: 3.9
        },
        {
          userId: 'player4',
          playerName: 'DrawWarrior',
          totalGames: 33,
          totalWins: 24,
          totalLosses: 9,
          totalKills: 89,
          totalDeaths: 41,
          totalStrokes: 523,
          tournamentsJoined: 4,
          tournamentsWon: 1,
          highestStreak: 9,
          currentStreak: 2,
          rating: 1320,
          lastPlayed: Date.now() - 7200000, // 2 hours ago
          winRate: 72.7,
          kdRatio: 2.2
        },
        {
          userId: 'player5',
          playerName: 'ArtOfWar',
          totalGames: 19,
          totalWins: 11,
          totalLosses: 8,
          totalKills: 34,
          totalDeaths: 28,
          totalStrokes: 189,
          tournamentsJoined: 2,
          tournamentsWon: 0,
          highestStreak: 5,
          currentStreak: 1,
          rating: 1180,
          lastPlayed: Date.now() - 10800000, // 3 hours ago
          winRate: 57.9,
          kdRatio: 1.2
        }
      ]

      // Sort by rating by default
      const sortedStats = mockStats.sort((a, b) => b.rating - a.rating)
      setPlayerStats(sortedStats)
      
      const userStats = sortedStats.find(s => s.userId === currentUser.id)
      setCurrentUserStats(userStats || null)
      
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser.id, currentUser.email])

  const sortPlayersByCategory = (category: string) => {
    const sorted = [...playerStats].sort((a, b) => {
      switch (category) {
        case 'rating':
          return b.rating - a.rating
        case 'wins':
          return b.totalWins - a.totalWins
        case 'winRate':
          return b.winRate - a.winRate
        case 'kills':
          return b.totalKills - a.totalKills
        case 'kdRatio':
          return b.kdRatio - a.kdRatio
        case 'tournaments':
          return b.tournamentsWon - a.tournamentsWon
        case 'streak':
          return b.highestStreak - a.highestStreak
        default:
          return b.rating - a.rating
      }
    })
    return sorted
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />
      case 3:
        return <Trophy className="w-5 h-5 text-amber-600" />
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-slate-400 font-bold">#{rank}</span>
    }
  }

  const getRatingBadge = (rating: number) => {
    if (rating >= 1400) return { label: 'Master', color: 'bg-purple-600' }
    if (rating >= 1300) return { label: 'Expert', color: 'bg-blue-600' }
    if (rating >= 1200) return { label: 'Advanced', color: 'bg-green-600' }
    if (rating >= 1100) return { label: 'Intermediate', color: 'bg-yellow-600' }
    return { label: 'Beginner', color: 'bg-gray-600' }
  }

  const formatLastPlayed = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Leaderboard...</p>
        </div>
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
              Leaderboard
            </h1>
            <p className="text-slate-300">Track your progress and compete with the best fighters</p>
          </div>
          
          <Button
            onClick={onBack}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Back to Lobby
          </Button>
        </div>

        {/* Current User Stats Card */}
        {currentUserStats && (
          <Card className="bg-gradient-to-r from-orange-900/20 to-purple-900/20 border-orange-600 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{currentUserStats.rating}</div>
                  <div className="text-xs text-slate-400">Rating</div>
                  <Badge className={`mt-1 ${getRatingBadge(currentUserStats.rating).color}`}>
                    {getRatingBadge(currentUserStats.rating).label}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{currentUserStats.totalWins}</div>
                  <div className="text-xs text-slate-400">Wins</div>
                  <div className="text-xs text-slate-500">{currentUserStats.winRate.toFixed(1)}% rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{currentUserStats.totalKills}</div>
                  <div className="text-xs text-slate-400">Kills</div>
                  <div className="text-xs text-slate-500">{currentUserStats.kdRatio.toFixed(1)} K/D</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{currentUserStats.tournamentsWon}</div>
                  <div className="text-xs text-slate-400">Tournaments</div>
                  <div className="text-xs text-slate-500">{currentUserStats.tournamentsJoined} joined</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{currentUserStats.highestStreak}</div>
                  <div className="text-xs text-slate-400">Best Streak</div>
                  <div className="text-xs text-slate-500">{currentUserStats.currentStreak} current</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-400">{currentUserStats.totalStrokes}</div>
                  <div className="text-xs text-slate-400">Total Strokes</div>
                  <div className="text-xs text-slate-500">{currentUserStats.totalGames} games</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 bg-slate-800 mb-6">
            <TabsTrigger value="rating" className="data-[state=active]:bg-orange-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              Rating
            </TabsTrigger>
            <TabsTrigger value="wins" className="data-[state=active]:bg-green-600">
              <Trophy className="w-4 h-4 mr-1" />
              Wins
            </TabsTrigger>
            <TabsTrigger value="winRate" className="data-[state=active]:bg-blue-600">
              <Target className="w-4 h-4 mr-1" />
              Win Rate
            </TabsTrigger>
            <TabsTrigger value="kills" className="data-[state=active]:bg-red-600">
              <Sword className="w-4 h-4 mr-1" />
              Kills
            </TabsTrigger>
            <TabsTrigger value="kdRatio" className="data-[state=active]:bg-purple-600">
              K/D
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-yellow-600">
              <Crown className="w-4 h-4 mr-1" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="streak" className="data-[state=active]:bg-pink-600">
              Streak
            </TabsTrigger>
          </TabsList>

          {(['rating', 'wins', 'winRate', 'kills', 'kdRatio', 'tournaments', 'streak'] as const).map(category => (
            <TabsContent key={category} value={category}>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    {category === 'rating' && <TrendingUp className="w-5 h-5 text-orange-500" />}
                    {category === 'wins' && <Trophy className="w-5 h-5 text-green-500" />}
                    {category === 'winRate' && <Target className="w-5 h-5 text-blue-500" />}
                    {category === 'kills' && <Sword className="w-5 h-5 text-red-500" />}
                    {category === 'kdRatio' && <Sword className="w-5 h-5 text-purple-500" />}
                    {category === 'tournaments' && <Crown className="w-5 h-5 text-yellow-500" />}
                    {category === 'streak' && <Star className="w-5 h-5 text-pink-500" />}
                    {category.charAt(0).toUpperCase() + category.slice(1)} Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sortPlayersByCategory(category).map((player, index) => (
                      <div 
                        key={player.userId}
                        className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                          player.userId === currentUser.id 
                            ? 'bg-orange-900/30 border border-orange-600' 
                            : 'bg-slate-700/50 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8">
                            {getRankIcon(index + 1)}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{player.playerName}</span>
                              {player.userId === currentUser.id && (
                                <Badge className="bg-orange-600 text-xs">You</Badge>
                              )}
                              <Badge className={`text-xs ${getRatingBadge(player.rating).color}`}>
                                {getRatingBadge(player.rating).label}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-400">
                              {player.totalGames} games • Last played {formatLastPlayed(player.lastPlayed)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {category === 'rating' && player.rating}
                            {category === 'wins' && player.totalWins}
                            {category === 'winRate' && `${player.winRate.toFixed(1)}%`}
                            {category === 'kills' && player.totalKills}
                            {category === 'kdRatio' && player.kdRatio.toFixed(1)}
                            {category === 'tournaments' && player.tournamentsWon}
                            {category === 'streak' && player.highestStreak}
                          </div>
                          <div className="text-sm text-slate-400">
                            {category === 'rating' && `${player.totalWins}W ${player.totalLosses}L`}
                            {category === 'wins' && `${player.winRate.toFixed(1)}% win rate`}
                            {category === 'winRate' && `${player.totalWins}/${player.totalGames} games`}
                            {category === 'kills' && `${player.kdRatio.toFixed(1)} K/D ratio`}
                            {category === 'kdRatio' && `${player.totalKills}K ${player.totalDeaths}D`}
                            {category === 'tournaments' && `${player.tournamentsJoined} joined`}
                            {category === 'streak' && `${player.currentStreak} current`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Community Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Total Players:</span>
                <span className="text-white font-medium">{playerStats.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total Games:</span>
                <span className="text-white font-medium">
                  {playerStats.reduce((sum, p) => sum + p.totalGames, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total Kills:</span>
                <span className="text-white font-medium">
                  {playerStats.reduce((sum, p) => sum + p.totalKills, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total Strokes:</span>
                <span className="text-white font-medium">
                  {playerStats.reduce((sum, p) => sum + p.totalStrokes, 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {playerStats
                .sort((a, b) => b.lastPlayed - a.lastPlayed)
                .slice(0, 5)
                .map(player => (
                  <div key={player.userId} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">{player.playerName}</span>
                    <span className="text-slate-400 text-xs">
                      {formatLastPlayed(player.lastPlayed)}
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Highest Rating:</span>
                  <span className="text-yellow-400 font-medium">
                    {Math.max(...playerStats.map(p => p.rating))}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Best Win Rate:</span>
                  <span className="text-green-400 font-medium">
                    {Math.max(...playerStats.map(p => p.winRate)).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Longest Streak:</span>
                  <span className="text-purple-400 font-medium">
                    {Math.max(...playerStats.map(p => p.highestStreak))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Most Tournaments:</span>
                  <span className="text-blue-400 font-medium">
                    {Math.max(...playerStats.map(p => p.tournamentsWon))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}