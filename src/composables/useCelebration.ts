import confetti from 'canvas-confetti'

export function useCelebration() {
  function monarchCrown() {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#CBAC5E', '#f5d998', '#c9a93e'],
    })
  }

  function playerEliminated() {
    confetti({
      particleCount: 30,
      spread: 120,
      startVelocity: 15,
      gravity: 2,
      colors: ['#ef4444', '#991b1b', '#450a0a'],
      shapes: ['circle'],
      scalar: 0.6,
    })
  }

  return { monarchCrown, playerEliminated }
}
