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

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32']

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-red-400/70 text-xs text-center py-4">{error}</p>
    )
  }

  if (!entries.length) {
    return (
      <p className="text-white/30 text-xs text-center py-4">No scores yet — be the first!</p>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white/80 tracking-wider uppercase">Leaderboard</h3>
        {playerRank && (
          <span className="text-xs text-cyan-400 font-semibold">
            #{playerRank}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {entries.map((e, i) => {
          const isPlayer = playerName && e.player_name.toLowerCase() === playerName.toLowerCase()
          const rankColor = i < 3 ? RANK_COLORS[i] : undefined

          return (
            <div
              key={e.id}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200
                ${isPlayer
                  ? 'bg-cyan-500/10 ring-1 ring-cyan-400/30'
                  : 'hover:bg-white/5'
                }
              `}
            >
              <span
                className="text-xs font-bold w-6 text-center shrink-0"
                style={rankColor ? { color: rankColor } : { color: 'rgba(255,255,255,0.3)' }}
              >
                {rankColor && i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
              </span>

              {e.avatar_url && (
                <img
                  src={e.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full border border-white/10 object-cover shrink-0"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}

              <span className="flex-1 text-sm text-white/70 truncate min-w-0">
                {e.player_name}
              </span>

              <span className="text-sm font-bold text-cyan-300 shrink-0 tabular-nums">
                {e.score.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
