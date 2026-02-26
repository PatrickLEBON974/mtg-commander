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

  function victory() {
    // Big celebratory burst
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#CBAC5E', '#f5d998', '#ffffff', '#e8600a', '#4a90e2'],
    })
    // Follow-up side bursts
    setTimeout(() => {
      confetti({ particleCount: 40, angle: 60, spread: 50, origin: { x: 0, y: 0.7 }, colors: ['#CBAC5E', '#f5d998'] })
      confetti({ particleCount: 40, angle: 120, spread: 50, origin: { x: 1, y: 0.7 }, colors: ['#CBAC5E', '#f5d998'] })
    }, 250)
  }

  return { monarchCrown, playerEliminated, victory }
}
