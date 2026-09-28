import React, { useEffect, useRef } from 'react';
import { DISTRICTS, ROAD_NETWORK } from '../game/world/DistrictData';
import { DistrictId } from '../types/game';

interface MiniMapProps {
  playerPos: [number, number]; // [x, z]
  playerHeading: number; // radians
  targetPos: [number, number, number] | null;
  currentDistrict?: DistrictId;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerPos,
  playerHeading,
  targetPos,
  currentDistrict,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Zoom scale: 1 world unit = X pixels
    const scale = 0.38;

    // Clear circular radar map
    ctx.clearRect(0, 0, width, height);

    // Save for clipping to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, width / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    // Map Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Transform world relative to player (player centered)
    ctx.save();
    ctx.translate(centerX, centerY);

    // Lake area (x: 220, z: 190, r: 80)
    const lakeScreenX = (220 - playerPos[0]) * scale;
    const lakeScreenY = (190 - playerPos[1]) * scale;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(lakeScreenX, lakeScreenY, 60 * scale, 45 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw Roads
    ctx.lineWidth = 6 * scale;
    ctx.strokeStyle = '#475569';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ROAD_NETWORK.forEach((road) => {
      const x1 = (road.p1[0] - playerPos[0]) * scale;
      const y1 = (road.p1[2] - playerPos[1]) * scale;
      const x2 = (road.p2[0] - playerPos[0]) * scale;
      const y2 = (road.p2[2] - playerPos[1]) * scale;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Draw Bridge Accent
    ROAD_NETWORK.filter((r) => r.isBridge).forEach((road) => {
      const x1 = (road.p1[0] - playerPos[0]) * scale;
      const y1 = (road.p1[2] - playerPos[1]) * scale;
      const x2 = (road.p2[0] - playerPos[0]) * scale;
      const y2 = (road.p2[2] - playerPos[1]) * scale;

      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // District Markers
    Object.values(DISTRICTS).forEach((dist) => {
      const dx = (dist.center[0] - playerPos[0]) * scale;
      const dy = (dist.center[1] - playerPos[1]) * scale;

      // Small district ring
      ctx.strokeStyle = `${dist.color}40`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(dx, dy, dist.radius * scale, 0, Math.PI * 2);
      ctx.stroke();

      // Dot
      ctx.fillStyle = dist.color;
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Target Objective Marker
    if (targetPos) {
      const tx = (targetPos[0] - playerPos[0]) * scale;
      const ty = (targetPos[2] - playerPos[1]) * scale;
      const distFromPlayer = Math.hypot(tx, ty);
      const maxRadarDist = width / 2 - 12;

      let drawX = tx;
      let drawY = ty;

      // If off radar edge, clamp to edge
      if (distFromPlayer > maxRadarDist) {
        const angle = Math.atan2(ty, tx);
        drawX = Math.cos(angle) * maxRadarDist;
        drawY = Math.sin(angle) * maxRadarDist;
      }

      // Objective Ping
      const now = performance.now() * 0.005;
      const pulseRadius = 5 + Math.sin(now) * 2;

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(drawX, drawY, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(drawX, drawY, pulseRadius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore(); // restore translated origin

    // Player Arrow (Always at center, pointing in heading direction)
    ctx.save();
    ctx.translate(centerX, centerY);
    // Heading in radians: forward in Three.js is +Z, heading=0 is pointing down (+Y on 2D canvas)
    ctx.rotate(playerHeading);

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 7); // front nose
    ctx.lineTo(-5, -6);
    ctx.lineTo(0, -3);
    ctx.lineTo(5, -6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
    ctx.restore(); // restore clip

    // Circular outer border with subtle compass ticks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, width / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Compass North Indicator
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, 12);
  }, [playerPos, playerHeading, targetPos]);

  return (
    <div className="relative flex flex-col items-center select-none">
      <div className="relative rounded-full shadow-lg border border-white/10 backdrop-blur-md overflow-hidden bg-slate-900/60 p-1">
        <canvas ref={canvasRef} width={130} height={130} className="rounded-full block" />
      </div>
      {currentDistrict && (
        <div className="mt-1.5 px-2 py-0.5 rounded text-[11px] font-medium tracking-wide text-slate-300 bg-slate-900/80 border border-white/10 whitespace-nowrap">
          {DISTRICTS[currentDistrict]?.name || 'Northbridge'}
        </div>
      )}
    </div>
  );
};
