import { useEffect, useRef, useCallback } from 'react'

interface SoundManagerProps {
  enabled: boolean
}

export function SoundManager({ enabled }: SoundManagerProps) {
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (enabled && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [enabled])

  const playTone = useCallback((frequency: number, duration: number, volume: number = 0.1) => {
    if (!enabled || !audioContextRef.current) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration)

    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration)
  }, [enabled])

  // Expose sound effects
  useEffect(() => {
    (window as any).gameAudio = {
      playHit: () => playTone(200, 0.1, 0.2),
      playDraw: () => playTone(400, 0.05, 0.1),
      playMove: () => playTone(300, 0.03, 0.05),
      playWin: () => {
        playTone(523, 0.2, 0.15) // C5
        setTimeout(() => playTone(659, 0.2, 0.15), 100) // E5
        setTimeout(() => playTone(784, 0.4, 0.15), 200) // G5
      },
      playLose: () => {
        playTone(392, 0.3, 0.15) // G4
        setTimeout(() => playTone(349, 0.3, 0.15), 150) // F4
        setTimeout(() => playTone(294, 0.5, 0.15), 300) // D4
      }
    }
  }, [enabled, playTone])

  return null
}