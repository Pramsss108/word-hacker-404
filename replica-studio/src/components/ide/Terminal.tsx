'use client'

import { useEffect, useRef } from 'react'
import type { Terminal as XTerm } from 'xterm'

interface AgentTerminalProps {
  logs: string[]
  command: string
  onCommandChange: (value: string) => void
  onSubmit: () => void
  isBusy?: boolean
}

export function AgentTerminal({ logs, command, onCommandChange, onSubmit, isBusy }: AgentTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const readyRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const disposeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }
    let active = true
    const init = async () => {
      const [{ Terminal }] = await Promise.all([
        import('xterm'),
        import('xterm/css/xterm.css'),
      ])
      if (!active || !containerRef.current) {
        return
      }
      const terminal = new Terminal({
        convertEol: true,
        allowTransparency: true,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#00ff90',
        },
      })
      termRef.current = terminal
      frameRef.current = requestAnimationFrame(() => {
        if (!containerRef.current || !active) {
          return
        }
        terminal.open(containerRef.current)
        readyRef.current = true
        terminal.writeln('\u001b[32mReplica Studio Terminal connected.\u001b[0m')
      })
      disposeRef.current = () => {
        terminal.dispose()
        termRef.current = null
      }
    }

    init()

    return () => {
      active = false
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      readyRef.current = false
      disposeRef.current?.()
      disposeRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!termRef.current || !readyRef.current) {
      return
    }
    termRef.current.reset()
    termRef.current.writeln('\u001b[32mReplica Studio Terminal connected.\u001b[0m')
    logs.forEach((line) => {
      termRef.current?.writeln(line)
    })
  }, [logs])

  return (
    <div className="terminal-shell">
      <div className="terminal-output" ref={containerRef} />
      <form
        className="terminal-input-row"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <span className="prompt-prefix">&gt;</span>
        <input
          className="terminal-input"
          value={command}
          onChange={(event) => onCommandChange(event.target.value)}
          placeholder="generate --subject 'anatomy'"
        />
        <button type="submit" className="terminal-run" disabled={isBusy}>
          {isBusy ? 'Running...' : 'Run'}
        </button>
      </form>
    </div>
  )
}
