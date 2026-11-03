import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, getSupabaseClient } from '../lib/supabaseClient'
import {
  LivePlayer,
  LivePlayerUpdate,
  LocalPlayerState,
  parseLivePlayerUpdate,
} from '../lib/livePlayers'

const LIVE_CHANNEL = 'flappy-avatar-global'
const UPDATE_INTERVAL_MS = 250
const PLAYER_STALE_MS = 1_500
const MAX_TRACKED_LIVE_PLAYERS = 32
export const MAX_VISIBLE_LIVE_PLAYERS = 4

interface UseLivePlayersResult {
  remotePlayers: LivePlayer[]
  connected: boolean
  connectionError: boolean
  reportPosition: (state: LocalPlayerState) => void
}

function createPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `pilot-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useLivePlayers(
  active: boolean,
  avatarEmoji: string,
  colorId: string,
): UseLivePlayersResult {
  const playerIdRef = useRef<string | null>(null)
  if (!playerIdRef.current) playerIdRef.current = createPlayerId()

  const latestStateRef = useRef<LocalPlayerState | null>(null)
  const remotePlayersRef = useRef(new Map<string, LivePlayer>())
  const [remotePlayers, setRemotePlayers] = useState<LivePlayer[]>([])
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(false)

  const reportPosition = useCallback((state: LocalPlayerState) => {
    latestStateRef.current = state
  }, [])

  useEffect(() => {
    if (!active || !isSupabaseConfigured) {
      latestStateRef.current = null
      remotePlayersRef.current.clear()
      setRemotePlayers([])
      setConnected(false)
      setConnectionError(false)
      return
    }

    remotePlayersRef.current.clear()
    setRemotePlayers([])
    const supabase = getSupabaseClient()
    if (!supabase) {
      setConnected(false)
      return
    }

    let disposed = false
    let sendTimer: number | undefined
    let sendInFlight = false
    let sendFailureLogged = false
    const playerId = playerIdRef.current!

    const publishRemotePlayers = () => {
      const now = Date.now()
      for (const [id, player] of remotePlayersRef.current) {
        if (now - player.receivedAt > PLAYER_STALE_MS) remotePlayersRef.current.delete(id)
      }

      const nextPlayers = [...remotePlayersRef.current.values()]
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, MAX_VISIBLE_LIVE_PLAYERS)
      setRemotePlayers(current => {
        const unchanged = current.length === nextPlayers.length &&
          current.every((player, index) =>
            player.id === nextPlayers[index].id &&
            player.y === nextPlayers[index].y &&
            player.score === nextPlayers[index].score &&
            player.avatarEmoji === nextPlayers[index].avatarEmoji &&
            player.colorId === nextPlayers[index].colorId
          )
        return unchanged ? current : nextPlayers
      })
    }

    const channel = supabase
      .channel(LIVE_CHANNEL, { config: { broadcast: { ack: false, self: false } } })
      .on('broadcast', { event: 'player_state' }, ({ payload }) => {
        if (disposed) return
        const update = parseLivePlayerUpdate(payload)
        if (!update || update.id === playerId) return

        remotePlayersRef.current.set(update.id, { ...update, receivedAt: Date.now() })
        if (remotePlayersRef.current.size > MAX_TRACKED_LIVE_PLAYERS) {
          const oldestPlayer = [...remotePlayersRef.current.values()]
            .sort((a, b) => a.receivedAt - b.receivedAt)[0]
          if (oldestPlayer) remotePlayersRef.current.delete(oldestPlayer.id)
        }
        publishRemotePlayers()
      })

    const sendPlayerState = () => {
      if (disposed || sendInFlight) return
      const localState = latestStateRef.current
      if (!localState) return

      const update: LivePlayerUpdate = {
        id: playerId,
        avatarEmoji,
        colorId,
        y: Math.min(1, Math.max(0, localState.y)),
        score: Math.min(999_999, Math.max(0, Math.floor(localState.score))),
      }

      sendInFlight = true
      void channel.send({
        type: 'broadcast',
        event: 'player_state',
        payload: update,
      }).then(status => {
        if (status !== 'ok' && !sendFailureLogged) {
          sendFailureLogged = true
          if (!disposed) {
            setConnected(false)
            setConnectionError(true)
          }
          console.warn('Live player update was not delivered:', status)
        }
      }).catch(error => {
        if (!sendFailureLogged) {
          sendFailureLogged = true
          if (!disposed) {
            setConnected(false)
            setConnectionError(true)
          }
          console.warn('Live player update failed:', error)
        }
      }).finally(() => {
        sendInFlight = false
      })
    }

    channel.subscribe((status, error) => {
      if (disposed) return
      if (status === 'SUBSCRIBED') {
        setConnected(true)
        setConnectionError(false)
        sendFailureLogged = false
        if (sendTimer === undefined) {
          sendPlayerState()
          sendTimer = window.setInterval(() => {
            sendPlayerState()
            publishRemotePlayers()
          }, UPDATE_INTERVAL_MS)
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnected(false)
        setConnectionError(true)
        if (sendTimer !== undefined) {
          window.clearInterval(sendTimer)
          sendTimer = undefined
        }
        if (!sendFailureLogged) {
          sendFailureLogged = true
          console.warn('Live players could not connect:', error ?? status)
        }
      } else if (status === 'CLOSED') {
        setConnected(false)
        if (sendTimer !== undefined) {
          window.clearInterval(sendTimer)
          sendTimer = undefined
        }
      }
    })

    return () => {
      disposed = true
      if (sendTimer !== undefined) window.clearInterval(sendTimer)
      remotePlayersRef.current.clear()
      void supabase.removeChannel(channel).then(status => {
        if (status !== 'ok') console.warn('Could not close the live players channel:', status)
      }).catch(error => {
        console.warn('Could not close the live players channel:', error)
      })
    }
  }, [active, avatarEmoji, colorId])

  return { remotePlayers, connected, connectionError, reportPosition }
}
