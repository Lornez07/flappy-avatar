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

import { createClient } from '@supabase/supabase-js';
import { LeaderboardEntry, LeaderboardResponse } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Leaderboard features disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// AVATAR UPLOAD
// ============================================================================

/**
 * Upload cropped avatar to Supabase Storage
 *
 * @param canvasDataUrl - Base64 data URL from canvas.toDataURL()
 * @param playerName - Player name for filename
 * @returns Public URL of uploaded image or null on error
 */
export async function uploadAvatarToStorage(
  canvasDataUrl: string,
  playerName: string
): Promise<string | null> {
  try {
    // Convert data URL to blob
    const response = await fetch(canvasDataUrl);
    const blob = await response.blob();

    // Create unique filename
    const timestamp = Date.now();
    const filename = `${playerName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${timestamp}.png`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filename, blob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error('Avatar upload error:', error);
      return null;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Avatar upload exception:', error);
    return null;
  }
}

// ============================================================================
// LEADERBOARD - WRITE
// ============================================================================

/**
 * Submit score to leaderboard
 *
 * @param playerName - Player name (max 50 chars)
 * @param score - Game score
 * @param avatarUrl - Public URL of avatar image (optional)
 * @returns Success status
 */
export async function submitScore(
  playerName: string,
  score: number,
  avatarUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('leaderboards')
      .insert({
        player_name: playerName.slice(0, 50),
        score: Math.max(0, Math.min(score, 999999)), // Sanity check
        avatar_url: avatarUrl || null,
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
  try {
    const sanitizedLimit = Math.min(Math.max(1, limit), 100);

    const { data, error } = await supabase
      .from('leaderboards')
      .select('*')
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
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('*')
      .eq('player_name', playerName)
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
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('*')
      .order('score', { ascending: false });

    if (error) {
      return {
        leaderboard: [],
        playerRank: null,
        playerRecord: null,
        error: error.message,
      };
    }

    const allRecords = (data || []) as LeaderboardEntry[];
    const leaderboard = allRecords.slice(0, limit);

    // Find player rank
    const playerRecordIndex = allRecords.findIndex(
      (r) => r.player_name.toLowerCase() === playerName.toLowerCase()
    );
    const playerRecord = playerRecordIndex >= 0 ? allRecords[playerRecordIndex] : null;
    const playerRank = playerRecordIndex >= 0 ? playerRecordIndex + 1 : null;

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
