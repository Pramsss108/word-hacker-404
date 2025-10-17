import { useEffect, useRef } from 'react'

type Props = {
  density?: number // columns per 1000px width
  speed?: number // pixels per frame
  opacity?: number // 0..1
}

export default function MatrixRain({ density = 24, speed = 2, opacity = 0.08 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let running = true
    let width = 0, height = 0
    let columns = 0
    let drops: number[] = []
    const digits = ['0', '1']
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight
      canvas.width = width
      canvas.height = height
      const colWidth = 14 // px per column
      columns = Math.max(10, Math.floor((width / 1000) * density))
      const actualColWidth = Math.max(colWidth, Math.floor(width / columns))
      columns = Math.floor(width / actualColWidth)
      drops = Array.from({ length: columns }, () => Math.floor(Math.random() * height))
      ctx.font = `12px 'JetBrains Mono', monospace`
    }

    const draw = () => {
      if (!running) return
      // fade the canvas slightly to create trailing effect
      ctx.fillStyle = `rgba(0, 0, 0, ${isReduced ? 0.2 : 0.08})`
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = `rgba(10,255,106, ${opacity})`
      for (let i = 0; i < drops.length; i++) {
        const x = i * (width / drops.length)
        const y = drops[i]
        const char = digits[Math.random() > 0.5 ? 1 : 0]
        ctx.fillText(char, x, y)
        drops[i] = y + (isReduced ? speed * 0.4 : speed + Math.random() * 2)
        if (drops[i] > height) drops[i] = 0
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      } else {
        running = true
        rafRef.current = requestAnimationFrame(draw)
      }
    }

    resize()
    rafRef.current = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [density, speed, opacity])

  return <canvas ref={canvasRef} className="matrix-canvas" aria-hidden />
}
