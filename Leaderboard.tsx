/**
 * Leaderboard Component
 *
 * Displays top scores with avatar thumbnails
 * Supports pagination and optional player highlight
 */

import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';
import {
  fetchLeaderboard,
  fetchLeaderboardWithPlayerRank,
} from '../lib/supabaseClient';

interface LeaderboardProps {
  playerName?: string;
  limit?: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  playerName,
  limit = 10,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (playerName) {
          const result = await fetchLeaderboardWithPlayerRank(playerName, limit);
          if (result.error) {
            setError(result.error);
          } else {
            setEntries(result.leaderboard);
            setPlayerRank(result.playerRank);
          }
        } else {
          const result = await fetchLeaderboard(limit);
          if (result.error) {
            setError(result.error);
          } else {
            setEntries(result.data);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [playerName, limit]);

  if (isLoading) {
    return (
      <div className="text-white text-center py-8">
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-center py-8">
        <p>Failed to load leaderboard: {error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-white text-center py-8">
        <p>No scores yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-white text-xl font-bold mb-4">🏆 Leaderboard</h3>

      {playerRank && (
        <p className="text-yellow-300 text-sm mb-3">
          Your rank: #{playerRank}
        </p>
      )}

      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="bg-black/30 rounded-lg p-3 flex items-center gap-4 hover:bg-black/50 transition"
          >
            {/* Rank */}
            <div className="text-yellow-300 font-bold text-lg w-8 text-center">
              #{index + 1}
            </div>

            {/* Avatar */}
            {entry.avatar_url && (
              <img
                src={entry.avatar_url}
                alt={entry.player_name}
                className="w-10 h-10 rounded-full border border-white/50 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}

            {/* Player info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">
                {entry.player_name}
              </p>
              <p className="text-white/60 text-xs">
                {new Date(entry.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Score */}
            <div className="text-right">
              <p className="text-white font-bold text-lg">{entry.score}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
