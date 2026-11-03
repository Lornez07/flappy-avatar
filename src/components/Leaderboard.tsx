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

const RANK_COLORS = ['#d84c3f', '#4a8f9b', '#c08a30']

const AVATAR_COLORS = ['#4a8f9b', '#bd5962', '#66834f', '#d2a43d', '#d84c3f', '#536c9a', '#80618b', '#c0784e', '#5a8b72', '#bd7187']

function stringToColor(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export const Leaderboard: React.FC<Props> = ({ playerName, limit = 10 }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [playerRank, setPlayerRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (playerName) {
          const res = await fetchLeaderboardWithPlayerRank(playerName, limit)
          if (cancelled) return
          if (res.error) { setError(res.error) }
          else { setEntries(res.leaderboard); setPlayerRank(res.playerRank) }
        } else {
          const res = await fetchLeaderboard(limit)
          if (cancelled) return
          if (res.error) { setError(res.error) }
          else { setEntries(res.data); setPlayerRank(null) }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => { cancelled = true }
  }, [playerName, limit, attempt])

  if (loading) {
    return (
      <div className="leaderboard-loading" role="status" aria-label="Loading leaderboard">Checking the scorebook…</div>
    )
  }

  if (error) {
    return (
      <div>
        <p className="leaderboard-error">{error}</p>
        <button
          onClick={() => setAttempt(a => a + 1)}
          className="leaderboard-retry"
        >
          TRY AGAIN
        </button>
      </div>
    )
  }

  if (!entries.length) {
    return (
      <p className="leaderboard-empty">No scores yet — make the first mark.</p>
    )
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-heading">
        <h3>HIGH SCORE CLUB</h3>
        {playerRank && (
          <span className="leaderboard-rank">
            #{playerRank}
          </span>
        )}
      </div>

      <div className="leaderboard-list">
        {entries.map((e, i) => {
          const isPlayer = Boolean(playerName && e.player_name.toLowerCase() === playerName.toLowerCase())
          const rankColor = i < 3 ? RANK_COLORS[i] : undefined
          const medal = rankColor ? ['🥇', '🥈', '🥉'][i] : undefined

          return (
            <div
              key={e.id}
              className={`leaderboard-row ${isPlayer ? 'is-player' : ''}`}
            >
              <span
                className="leaderboard-position"
                style={rankColor ? { color: rankColor } : undefined}
                aria-label={medal ? `Rank ${i + 1}` : undefined}
              >
                {medal ?? `#${i + 1}`}
              </span>

              <div className="leaderboard-avatar"
                style={{ background: stringToColor(e.player_name) }}
              >
                {e.avatar_url ? (
                  <img
                    src={e.avatar_url}
                    alt=""
                    loading="lazy"
                    className=""
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : null}
                <span>{e.player_name[0]?.toUpperCase() || '?'}</span>
              </div>

              <span className="leaderboard-name">
                {e.player_name}
              </span>

              <span className="leaderboard-score">
                {e.score.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
