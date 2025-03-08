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
      <div className="absolute top-4 left-4 text-white">
        <h2 className="text-xl font-bold">Controls:</h2>
        <ul className="mt-2 space-y-1">
          <li>Click game window to start aiming</li>
          <li>WASD - Drive car</li>
          <li>Mouse - Look around</li>
          <li>Mouse Wheel - Zoom in/out</li>
          <li>Space - Shoot</li>
          <li>V - Toggle view (First/Third person)</li>
          <li>ESC - Release mouse control</li>
        </ul>
      </div>
    </div>
  );
}