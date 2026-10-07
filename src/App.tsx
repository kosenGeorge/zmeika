import { useState, useEffect, useCallback, useRef } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

const GRID_SIZE = 20;
const SPEEDS: Record<Difficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 60,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'from-green-500 to-emerald-600',
  medium: 'from-yellow-500 to-orange-500',
  hard: 'from-red-500 to-rose-600',
};

function getRandomFood(snake: Position[]): Position {
  let food: Position;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === food.x && seg.y === food.y));
  return food;
}

function getInitialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

export default function App() {
  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [food, setFood] = useState<Position>(() => getRandomFood(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [scoreAnim, setScoreAnim] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const gameStateRef = useRef<GameState>('idle');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const resetGame = useCallback(() => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    setFood(getRandomFood(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setScore(0);
    setGameState('playing');
    lastTickRef.current = 0;
  }, []);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused');
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing');
      lastTickRef.current = 0;
    }
  }, []);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionRef.current;
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    if (opposites[newDir] !== current) {
      setDirection(newDir);
      directionRef.current = newDir;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === ' ' || key === 'Escape') {
        e.preventDefault();
        if (gameStateRef.current === 'idle' || gameStateRef.current === 'gameover') {
          resetGame();
        } else {
          togglePause();
        }
        return;
      }

      if (gameStateRef.current !== 'playing') return;

      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'ц':
        case 'Ц':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
        case 'ы':
        case 'Ы':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
        case 'ф':
        case 'Ф':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
        case 'в':
        case 'В':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, resetGame, togglePause]);

  // Touch controls
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const minSwipe = 30;

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

      if (gameStateRef.current !== 'playing') return;

      if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [changeDirection]);

  // Game loop
  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      if (gameStateRef.current !== 'playing') {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (!lastTickRef.current) {
        lastTickRef.current = timestamp;
      }

      const elapsed = timestamp - lastTickRef.current;
      const speed = SPEEDS[difficulty];

      if (elapsed >= speed) {
        lastTickRef.current = timestamp;

        setSnake(prevSnake => {
          const head = { ...prevSnake[0] };
          const dir = directionRef.current;

          switch (dir) {
            case 'UP': head.y -= 1; break;
            case 'DOWN': head.y += 1; break;
            case 'LEFT': head.x -= 1; break;
            case 'RIGHT': head.x += 1; break;
          }

          // Wall collision
          if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            setGameState('gameover');
            setScore(prev => {
              if (prev > highScore) {
                setHighScore(prev);
                localStorage.setItem('snake-high-score', prev.toString());
              }
              return prev;
            });
            return prevSnake;
          }

          // Self collision
          if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
            setGameState('gameover');
            setScore(prev => {
              if (prev > highScore) {
                setHighScore(prev);
                localStorage.setItem('snake-high-score', prev.toString());
              }
              return prev;
            });
            return prevSnake;
          }

          const newSnake = [head, ...prevSnake];

          // Food collision
          setFood(prevFood => {
            if (head.x === prevFood.x && head.y === prevFood.y) {
              setScore(prev => prev + 10);
              setScoreAnim(true);
              setTimeout(() => setScoreAnim(false), 300);
              return getRandomFood(newSnake);
            }
            newSnake.pop();
            return prevFood;
          });

          return newSnake;
        });
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [difficulty, highScore]);

  const getCellType = (x: number, y: number) => {
    if (snake[0]?.x === x && snake[0]?.y === y) return 'head';
    if (snake.some((seg, i) => i > 0 && seg.x === x && seg.y === y)) return 'body';
    if (food.x === x && food.y === y) return 'food';
    return 'empty';
  };

  const getHeadRotation = () => {
    switch (direction) {
      case 'UP': return 'rotate-[-90deg]';
      case 'DOWN': return 'rotate-90';
      case 'LEFT': return 'rotate-180';
      case 'RIGHT': return 'rotate-0';
    }
  };

  const getBodyOpacity = (index: number) => {
    const maxOpacity = 0.9;
    const minOpacity = 0.4;
    const ratio = index / Math.max(snake.length - 1, 1);
    return maxOpacity - ratio * (maxOpacity - minOpacity);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-lg mb-3 sm:mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-2">
          🐍 Змейка
        </h1>

        {/* Score Board */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Счёт:</span>
            <span className={`text-xl font-bold text-white ${scoreAnim ? 'animate-score-pop' : ''}`}>
              {score}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Рекорд:</span>
            <span className="text-xl font-bold text-yellow-400">
              {highScore}
            </span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div
        className={`relative w-full max-w-lg aspect-square rounded-xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 overflow-hidden ${gameState === 'gameover' ? 'animate-shake' : ''}`}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      >
        {/* Grid */}
        <div
          className="w-full h-full grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
            const x = idx % GRID_SIZE;
            const y = Math.floor(idx / GRID_SIZE);
            const cellType = getCellType(x, y);
            const isEven = (x + y) % 2 === 0;

            return (
              <div
                key={idx}
                className={`relative flex items-center justify-center ${isEven ? 'bg-white/[0.02]' : 'bg-transparent'}`}
              >
                {cellType === 'head' && (
                  <div className={`w-[90%] h-[90%] rounded-md bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 flex items-center justify-center ${getHeadRotation()} animate-snake-appear`}>
                    <div className="flex gap-[2px]">
                      <div className="w-[4px] h-[4px] sm:w-[5px] sm:h-[5px] rounded-full bg-white shadow-sm" />
                      <div className="w-[4px] h-[4px] sm:w-[5px] sm:h-[5px] rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                )}
                {cellType === 'body' && (
                  <div
                    className="w-[80%] h-[80%] rounded-sm bg-gradient-to-br from-green-500 to-emerald-600 animate-snake-appear"
                    style={{ opacity: getBodyOpacity(snake.findIndex(s => s.x === x && s.y === y)) }}
                  />
                )}
                {cellType === 'food' && (
                  <div className="w-[75%] h-[75%] rounded-full bg-gradient-to-br from-red-400 to-rose-500 shadow-lg shadow-red-500/50 animate-pulse-food flex items-center justify-center">
                    <div className="w-[30%] h-[30%] rounded-full bg-white/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overlays */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
            <div className="text-5xl mb-4">🐍</div>
            <h2 className="text-2xl font-bold text-white mb-2">Змейка</h2>
            <p className="text-slate-300 text-sm mb-6 text-center px-4">
              Управление: стрелки / WASD / свайпы
            </p>
            <button
              onClick={resetGame}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg shadow-lg shadow-green-500/30 hover:scale-105 transition-transform active:scale-95"
            >
              Начать игру
            </button>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
            <div className="text-5xl mb-4">⏸️</div>
            <h2 className="text-2xl font-bold text-white mb-4">Пауза</h2>
            <button
              onClick={togglePause}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform active:scale-95"
            >
              Продолжить
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
            <div className="text-5xl mb-4">💀</div>
            <h2 className="text-2xl font-bold text-red-400 mb-1">Игра окончена!</h2>
            <p className="text-white text-lg mb-1">Счёт: <span className="font-bold text-green-400">{score}</span></p>
            {score >= highScore && score > 0 && (
              <p className="text-yellow-400 text-sm mb-3 animate-pulse">🏆 Новый рекорд!</p>
            )}
            <button
              onClick={resetGame}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg shadow-green-500/30 hover:scale-105 transition-transform active:scale-95 mt-2"
            >
              Играть снова
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg mt-3 sm:mt-4 space-y-3">
        {/* Difficulty & Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Difficulty Selector */}
          <div className="flex rounded-lg overflow-hidden border border-purple-500/30">
            {(Object.keys(SPEEDS) as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => {
                  if (gameState === 'idle' || gameState === 'gameover') {
                    setDifficulty(d);
                  }
                }}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  difficulty === d
                    ? `bg-gradient-to-r ${DIFFICULTY_COLORS[d]} text-white`
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                } ${gameState !== 'idle' && gameState !== 'gameover' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>

          {/* Pause / Restart */}
          {(gameState === 'playing' || gameState === 'paused') && (
            <>
              <button
                onClick={togglePause}
                className="px-4 py-1.5 rounded-lg bg-slate-800/80 border border-purple-500/30 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all text-sm font-medium"
              >
                {gameState === 'paused' ? '▶ Продолжить' : '⏸ Пауза'}
              </button>
              <button
                onClick={resetGame}
                className="px-4 py-1.5 rounded-lg bg-slate-800/80 border border-purple-500/30 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all text-sm font-medium"
              >
                🔄 Заново
              </button>
            </>
          )}
        </div>

        {/* Mobile D-Pad */}
        <div className="flex justify-center sm:hidden">
          <div className="grid grid-cols-3 gap-1 w-40">
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('UP'); }}
              className="w-12 h-12 rounded-lg bg-slate-800/80 border border-purple-500/30 flex items-center justify-center text-white text-xl active:bg-purple-600/50 transition-colors"
            >
              ▲
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('LEFT'); }}
              className="w-12 h-12 rounded-lg bg-slate-800/80 border border-purple-500/30 flex items-center justify-center text-white text-xl active:bg-purple-600/50 transition-colors"
            >
              ◀
            </button>
            <div className="w-12 h-12 rounded-lg bg-slate-900/50 border border-purple-500/10 flex items-center justify-center text-purple-400/50 text-xs">
              ●
            </div>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('RIGHT'); }}
              className="w-12 h-12 rounded-lg bg-slate-800/80 border border-purple-500/30 flex items-center justify-center text-white text-xl active:bg-purple-600/50 transition-colors"
            >
              ▶
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('DOWN'); }}
              className="w-12 h-12 rounded-lg bg-slate-800/80 border border-purple-500/30 flex items-center justify-center text-white text-xl active:bg-purple-600/50 transition-colors"
            >
              ▼
            </button>
            <div />
          </div>
        </div>

        {/* Instructions */}
        <p className="text-center text-slate-500 text-xs hidden sm:block">
          Стрелки / WASD — движение • Пробел — пауза/старт
        </p>
      </div>
    </div>
  );
}
