/**
 * Supabase Configuration & Integration
 *
 * Setup:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Create Supabase project at https://supabase.com
 * 3. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
 * 4. Run the SQL schema (see schema.sql)
 * 5. Create public bucket named "avatars" in Storage
 * 6. Enable CORS on the bucket for your domain
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LeaderboardEntry, LeaderboardResponse } from '../types';
import { clampScore, sanitizePlayerName } from './validation';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Whether Supabase credentials are present. The client is created lazily so a
 * missing .env.local degrades the leaderboard instead of crashing on import.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const NOT_CONFIGURED_ERROR =
  'Leaderboard is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    console.warn('Supabase credentials not configured. Leaderboard features disabled.');
    return null;
  }
  if (!client) client = createClient(supabaseUrl, supabaseKey);
  return client;
}

// ============================================================================
// LEADERBOARD - WRITE
// ============================================================================

/**
 * Submit score to leaderboard
 *
 * @param playerName - Player name (sanitized, max 24 chars)
  * @param score - Game score (clamped to 0..999999)
  * @param avatarUrl - Small data-URL or public URL avatar image (optional)
 * @returns Success status
 */
export async function submitScore(
  playerName: string,
  score: number,
  avatarUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: NOT_CONFIGURED_ERROR };

  const name = sanitizePlayerName(playerName);
  if (!name) return { success: false, error: 'Enter a valid name' };

  // Note: this is a client-side sanity check for UX only. The authoritative
  // limits live in schema.sql constraints and the anti-abuse trigger.
  const safeScore = clampScore(score);

  const avatar = avatarUrl && avatarUrl.length <= 200_000 ? avatarUrl : null;

  try {
    const { error } = await supabase
      .from('leaderboards')
      .insert({
        player_name: name,
        score: safeScore,
        avatar_url: avatar,
      });

    if (error) {
      console.error('Score submission error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Score submission exception:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// LEADERBOARD - READ
// ============================================================================

/**
 * Fetch top scores from leaderboard
 *
 * @param limit - Number of top scores to fetch (default 10, max 100)
 * @returns Array of leaderboard entries or error
 */
export async function fetchLeaderboard(
  limit: number = 10
): Promise<LeaderboardResponse> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: NOT_CONFIGURED_ERROR };

  try {
    const sanitizedLimit = Math.min(Math.max(1, limit), 100);

    // Only the columns the UI renders — never expose avatar payloads of the
    // whole table, and keep the response small.
    const { data, error } = await supabase
      .from('leaderboards')
      .select('id, player_name, score, avatar_url, created_at')
      .order('score', { ascending: false })
      .limit(sanitizedLimit);

    if (error) {
      console.error('Leaderboard fetch error:', error);
      return { data: [], error: error.message };
    }

    return { data: (data || []) as LeaderboardEntry[], error: null };
  } catch (error) {
    console.error('Leaderboard fetch exception:', error);
    return { data: [], error: String(error) };
  }
}

/**
 * Fetch player's personal best score
 *
 * @param playerName - Player name
 * @returns Best score record or null
 */
export async function fetchPlayerBest(
  playerName: string
): Promise<LeaderboardEntry | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const name = sanitizePlayerName(playerName);
  if (!name) return null;

  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('id, player_name, score, avatar_url, created_at')
      .eq('player_name', name)
      .order('score', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No record found is not an error
      if (error.code === 'PGRST116') return null;
      console.error('Player best fetch error:', error);
      return null;
    }

    return (data || null) as LeaderboardEntry | null;
  } catch (error) {
    console.error('Player best fetch exception:', error);
    return null;
  }
}

/**
 * Fetch leaderboard with player's rank highlighted
 *
 * @param playerName - Player name to highlight
 * @param limit - Number of top scores to fetch
 * @returns Array with player record included with rank info
 */
export async function fetchLeaderboardWithPlayerRank(
  playerName: string,
  limit: number = 10
): Promise<{
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  playerRecord: LeaderboardEntry | null;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      leaderboard: [],
      playerRank: null,
      playerRecord: null,
      error: NOT_CONFIGURED_ERROR,
    };
  }

  const name = sanitizePlayerName(playerName);
  const sanitizedLimit = Math.min(Math.max(1, limit), 100);

  try {
    // Fetch only enough rows to cover the visible top-N plus the player's own
    // best, instead of streaming the entire table to the browser.
    const [topResult, playerResult] = await Promise.all([
      supabase
        .from('leaderboards')
        .select('id, player_name, score, avatar_url, created_at')
        .order('score', { ascending: false })
        .limit(sanitizedLimit),
      name
        ? supabase
            .from('leaderboards')
            .select('id, player_name, score, avatar_url, created_at')
            .eq('player_name', name)
            .order('score', { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (topResult.error) {
      return {
        leaderboard: [],
        playerRank: null,
        playerRecord: null,
        error: topResult.error.message,
      };
    }

    const leaderboard = (topResult.data || []) as LeaderboardEntry[];
    const playerRecord = ((playerResult.data || [])[0] as LeaderboardEntry) ?? null;

    // Rank is a count of strictly better scores; ties share the better rank.
    let playerRank: number | null = null;
    if (playerRecord) {
      const inTop = leaderboard.findIndex((r) => r.score === playerRecord.score);
      if (inTop >= 0) {
        playerRank = inTop + 1;
      } else {
        const { count } = await supabase
          .from('leaderboards')
          .select('id', { count: 'exact', head: true })
          .gt('score', playerRecord.score);
        playerRank = (count ?? 0) + 1;
      }
    }

    return { leaderboard, playerRank, playerRecord };
  } catch (error) {
    return {
      leaderboard: [],
      playerRank: null,
      playerRecord: null,
      error: String(error),
    };
  }
}
