import React, { useEffect, useState } from 'react'
import { LeaderboardEntry } from '../types'
import {
  fetchLeaderboard,
  fetchLeaderboardWithPlayerRank,
} from '../lib/supabaseClient'

interface Props {
  playerName?: string
  limit?: number
}

export const Leaderboard: React.FC<Props> = ({ playerName, limit = 10 }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [playerRank, setPlayerRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (playerName) {
          const res = await fetchLeaderboardWithPlayerRank(playerName, limit)
          if (res.error) { setError(res.error) }
          else { setEntries(res.leaderboard); setPlayerRank(res.playerRank) }
        } else {
          const res = await fetchLeaderboard(limit)
          if (res.error) { setError(res.error) }
          else { setEntries(res.data) }
        }
      } finally { setLoading(false) }
    }
    load()
  }, [playerName, limit])

  if (loading) return <p className="text-gray-400 text-center text-sm py-4">Loading...</p>
  if (error) return <p className="text-red-400 text-center text-sm py-4">{error}</p>
  if (!entries.length) return <p className="text-gray-400 text-center text-sm py-4">No scores yet!</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sky-800">🏆 Leaderboard</h3>
        {playerRank && (
          <span className="text-xs text-amber-600 font-semibold">Your rank: #{playerRank}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={e.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg even:bg-gray-50">
            <span className="text-xs font-bold text-gray-400 w-5 text-center shrink-0">#{i + 1}</span>
            {e.avatar_url && (
              <img
                src={e.avatar_url}
                alt=""
                className="w-7 h-7 rounded-full border border-gray-200 object-cover shrink-0"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
            <span className="flex-1 text-sm text-gray-700 truncate min-w-0">{e.player_name}</span>
            <span className="text-sm font-bold text-sky-700 shrink-0">{e.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
