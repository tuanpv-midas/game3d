import { useEffect, useRef } from 'react';
import { Game } from '../game/Game';

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = new Game(containerRef.current);

    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen bg-black">
    </div>
  );
}