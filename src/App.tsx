import { useState } from 'react'
import { Search, Zap, Trophy, Brain } from 'lucide-react'
import './App.css'

function App() {
  const [gameMode, setGameMode] = useState<'menu' | 'playing'>('menu')
  const [score] = useState(0)

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="title">
            <Zap className="icon" />
            Word Hacker 404
          </h1>
          <p className="subtitle">AI-Powered Word Challenge Game</p>
        </div>
      </header>

      <main className="main">
        {gameMode === 'menu' ? (
          <div className="menu">
            <div className="game-modes">
              <div className="mode-card">
                <Brain className="mode-icon" />
                <h3>Word Detective</h3>
                <p>Find hidden words with AI hints</p>
                <button 
                  className="mode-button"
                  onClick={() => setGameMode('playing')}
                >
                  Start Game
                </button>
              </div>

              <div className="mode-card">
                <Search className="mode-icon" />
                <h3>Pattern Hunter</h3>
                <p>Discover word patterns and connections</p>
                <button className="mode-button" disabled>
                  Coming Soon
                </button>
              </div>

              <div className="mode-card">
                <Trophy className="mode-icon" />
                <h3>Speed Challenge</h3>
                <p>Race against time with AI opponents</p>
                <button className="mode-button" disabled>
                  Coming Soon
                </button>
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <span className="stat-label">Best Score</span>
                <span className="stat-value">{score}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Games Played</span>
                <span className="stat-value">0</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="game">
            <div className="game-header">
              <button 
                className="back-button"
                onClick={() => setGameMode('menu')}
              >
                ← Back to Menu
              </button>
              <div className="score">Score: {score}</div>
            </div>
            
            <div className="game-content">
              <div className="game-placeholder">
                <Brain className="placeholder-icon" />
                <h3>Game Starting...</h3>
                <p>AI is preparing your word challenge!</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Built with React + TypeScript + Vite | AI-Powered Gaming Experience</p>
      </footer>
    </div>
  )
}

export default App