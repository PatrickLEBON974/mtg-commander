/**
 * Shared time formatting utilities.
 * Replaces duplicated formatTimeMs / formatDuration / formatTime across
 * LifeTracker, GameTimer, StatsView and GameHistoryModal.
 */

/** Format milliseconds as H:MM:SS or MM:SS */
export function formatMsToTimer(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const minutesPadded = String(minutes).padStart(2, '0')
  const secondsPadded = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${minutesPadded}:${secondsPadded}`
  return `${minutesPadded}:${secondsPadded}`
}

/** Format milliseconds as "Xm Ys" for stats display */
export function formatMsToMinSec(milliseconds: number): string {
  if (milliseconds === 0) return '0m 0s'
  const totalSeconds = Math.round(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

/** Format a timestamp relative to a start time as MM:SS */
export function formatRelativeTime(timestamp: number, startedAt: number): string {
  const elapsedSeconds = Math.floor((timestamp - startedAt) / 1000)
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
