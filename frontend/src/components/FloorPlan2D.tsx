import { useCallback, useEffect, useRef, useState } from "react";
import { footprintHalfExtents } from "../scene/constraints";
import { wallLength } from "../scene/room";
import { useSceneStore } from "../scene/store";

const WALL_FILL = "#4a5568";
const WALL_SELECTED = "#3182ce";
const DOOR_COLOR = "#b7791f";
const WINDOW_COLOR = "#63b3ed";
const COTA_COLOR = "#a0aec0";
const GRID_COLOR = "#2d3748";

export function FloorPlan2D() {
  const scene = useSceneStore((state) => state.scene);
  const selectedId = useSceneStore((state) => state.selectedId);
  const selectedOpeningId = useSceneStore((state) => state.selectedOpeningId);
  const selectedWallId = useSceneStore((state) => state.selectedWallId);
  const select = useSceneStore((state) => state.select);
  const selectOpening = useSceneStore((state) => state.selectOpening);
  const selectWall = useSceneStore((state) => state.selectWall);
  const patchObject = useSceneStore((state) => state.patchObject);
  const room = scene.room;

  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(80);
  const [pan, setPan] = useState({ x: 90, y: 90 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, z: 0 });
  const [rotatingObjectId, setRotatingObjectId] = useState<string | null>(null);

  const resetView = useCallback(() => {
    if (!svgRef.current) return;
    const { clientWidth, clientHeight } = svgRef.current;
    const padding = 140;
    const availableW = Math.max(clientWidth - padding, 100);
    const availableH = Math.max(clientHeight - padding, 100);
    const newScale = Math.min(availableW / room.width, availableH / room.depth);
    setScale(newScale);
    setPan({
      x: (clientWidth - room.width * newScale) / 2,
      y: (clientHeight - room.depth * newScale) / 2,
    });
  }, [room.width, room.depth]);

  useEffect(() => {
    resetView();
  }, [resetView]);

  const toWorld = useCallback(
    (clientX: number, clientY: number): { x: number; z: number } => {
      if (!svgRef.current) return { x: 0, z: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const px = clientX - rect.left - pan.x;
      const py = clientY - rect.top - pan.y;
      return { x: px / scale, z: py / scale };
    },
    [pan, scale],
  );

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.12 : 0.88;
    const nextScale = Math.min(Math.max(scale * zoomFactor, 25), 350);
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    setPan({
      x: mouseX - (mouseX - pan.x) * (nextScale / scale),
      y: mouseY - (mouseY - pan.y) * (nextScale / scale),
    });
    setScale(nextScale);
  };

  const handlePointerDownBg = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    select(null);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (isPanning) {
      setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y });
    } else if (draggingObjectId) {
      const world = toWorld(event.clientX, event.clientY);
      const targetObj = scene.objects.find((obj) => obj.id === draggingObjectId);
      if (targetObj && !targetObj.locked) {
        patchObject(draggingObjectId, {
          position: [world.x - dragOffset.x, targetObj.position[1], world.z - dragOffset.z],
        });
      }
    } else if (rotatingObjectId) {
      const world = toWorld(event.clientX, event.clientY);
      const targetObj = scene.objects.find((obj) => obj.id === rotatingObjectId);
      if (targetObj && !targetObj.locked) {
        const dx = world.x - targetObj.position[0];
        const dz = world.z - targetObj.position[2];
        const angle = Math.atan2(dx, -dz);
        patchObject(rotatingObjectId, {
          rotation: [targetObj.rotation[0], angle, targetObj.rotation[2]],
        });
      }
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setDraggingObjectId(null);
    setRotatingObjectId(null);
  };

  const selectedObject = scene.objects.find((candidate) => candidate.id === selectedId);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#16191f",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 5,
          display: "flex",
          gap: 6,
          background: "rgba(29, 33, 40, 0.85)",
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid #3a414e",
        }}
      >
        <span style={{ color: "#aab0bb", alignSelf: "center", fontSize: 12 }}>Plano 2D</span>
        <button onClick={() => setScale((s) => Math.min(s * 1.2, 350))}>+</button>
        <button onClick={() => setScale((s) => Math.max(s / 1.2, 25))}>-</button>
        <button onClick={resetView}>Centrar</button>
      </div>

      <svg
        ref={svgRef}
        style={{ width: "100%", height: "100%", cursor: isPanning ? "grabbing" : "default" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDownBg}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <pattern id="grid-pattern" width={scale} height={scale} patternUnits="userSpaceOnUse" x={pan.x} y={pan.y}>
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke={GRID_COLOR} strokeWidth="1" strokeDasharray="3 3" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid-pattern)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          <rect
            x={0}
            y={0}
            width={room.width}
            height={room.depth}
            fill="#232936"
            stroke="#2d3748"
            strokeWidth={0.02}
            onClick={(e) => {
              e.stopPropagation();
              select(null);
            }}
          />

          {room.walls.map((wall) => {
            const isHorizontal = Math.abs(wall.start[1] - wall.end[1]) < 0.001;
            const x = Math.min(wall.start[0], wall.end[0]);
            const z = Math.min(wall.start[1], wall.end[1]);
            const len = wallLength(wall);
            const w = isHorizontal ? len : wall.thickness;
            const h = isHorizontal ? wall.thickness : len;
            const posX = isHorizontal ? x : x - wall.thickness / 2;
            const posZ = isHorizontal ? z - wall.thickness / 2 : z;
            const isSelected = selectedWallId === wall.id;

            return (
              <rect
                key={wall.id}
                x={posX}
                y={posZ}
                width={w}
                height={h}
                fill={isSelected ? WALL_SELECTED : WALL_FILL}
                stroke={isSelected ? "#63b3ed" : "#1a202c"}
                strokeWidth={0.015}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectWall(wall.id);
                }}
              />
            );
          })}

          {room.openings.map((opening) => {
            const wall = room.walls.find((w) => w.id === opening.wallId);
            if (!wall) return null;
            const isHorizontal = Math.abs(wall.start[1] - wall.end[1]) < 0.001;
            const minX = Math.min(wall.start[0], wall.end[0]);
            const minZ = Math.min(wall.start[1], wall.end[1]);
            const isSelected = selectedOpeningId === opening.id;

            const opX = isHorizontal ? minX + opening.offset : minX - wall.thickness / 2;
            const opZ = isHorizontal ? minZ - wall.thickness / 2 : minZ + opening.offset;
            const opW = isHorizontal ? opening.width : wall.thickness;
            const opH = isHorizontal ? wall.thickness : opening.width;

            return (
              <g
                key={opening.id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectOpening(opening.id);
                }}
                style={{ cursor: "pointer" }}
              >
                <rect x={opX} y={opZ} width={opW} height={opH} fill="#232936" stroke="#232936" strokeWidth={0.01} />
                {opening.kind === "window" ? (
                  <g>
                    <rect
                      x={opX}
                      y={opZ}
                      width={opW}
                      height={opH}
                      fill="none"
                      stroke={isSelected ? "#3182ce" : WINDOW_COLOR}
                      strokeWidth={0.02}
                    />
                    <line
                      x1={isHorizontal ? opX : opX + opW / 2}
                      y1={isHorizontal ? opZ + opH / 2 : opZ}
                      x2={isHorizontal ? opX + opW : opX + opW / 2}
                      y2={isHorizontal ? opZ + opH / 2 : opZ + opH}
                      stroke={WINDOW_COLOR}
                      strokeWidth={0.03}
                    />
                  </g>
                ) : (
                  <g>
                    <rect
                      x={opX}
                      y={opZ}
                      width={opW}
                      height={opH}
                      fill="none"
                      stroke={isSelected ? "#3182ce" : DOOR_COLOR}
                      strokeWidth={0.02}
                    />
                    {isHorizontal ? (
                      <path
                        d={`M ${opX} ${opZ + opH} A ${opening.width} ${opening.width} 0 0 1 ${opX + opening.width} ${opZ + opH + opening.width}`}
                        fill="none"
                        stroke={DOOR_COLOR}
                        strokeWidth={0.015}
                        strokeDasharray="0.04 0.03"
                      />
                    ) : (
                      <path
                        d={`M ${opX + opW} ${opZ} A ${opening.width} ${opening.width} 0 0 1 ${opX + opW + opening.width} ${opZ + opening.width}`}
                        fill="none"
                        stroke={DOOR_COLOR}
                        strokeWidth={0.015}
                        strokeDasharray="0.04 0.03"
                      />
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {scene.objects.map((obj) => {
            if (!obj.visible) return null;
            const [hw, hd] = [obj.dimensions[0] * obj.scale[0], obj.dimensions[2] * obj.scale[2]];
            const isSelected = selectedId === obj.id;
            const angleDeg = (-obj.rotation[1] * 180) / Math.PI;

            return (
              <g
                key={obj.id}
                transform={`translate(${obj.position[0]}, ${obj.position[2]}) rotate(${angleDeg})`}
                style={{ cursor: obj.locked ? "default" : "move" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  select(obj.id);
                  if (!obj.locked) {
                    const world = toWorld(e.clientX, e.clientY);
                    setDraggingObjectId(obj.id);
                    setDragOffset({ x: world.x - obj.position[0], z: world.z - obj.position[2] });
                  }
                }}
              >
                <rect
                  x={-hw / 2}
                  y={-hd / 2}
                  width={hw}
                  height={hd}
                  rx={0.03}
                  ry={0.03}
                  fill={isSelected ? "rgba(49, 130, 206, 0.45)" : "rgba(113, 128, 150, 0.45)"}
                  stroke={isSelected ? "#63b3ed" : "#a0aec0"}
                  strokeWidth={isSelected ? 0.03 : 0.015}
                />
                <line x1={-hw / 2 + 0.04} y1={-hd / 2 + 0.04} x2={hw / 2 - 0.04} y2={-hd / 2 + 0.04} stroke="#cbd5e0" strokeWidth={0.02} />
                <text
                  x={0}
                  y={0.03}
                  fill="#ffffff"
                  fontSize={Math.min(hw * 0.22, hd * 0.22, 0.16)}
                  textAnchor="middle"
                  pointerEvents="none"
                  fontWeight="bold"
                >
                  {obj.name}
                </text>
                <text
                  x={0}
                  y={Math.min(hd * 0.22, 0.14)}
                  fill="#cbd5e0"
                  fontSize={Math.min(hw * 0.16, hd * 0.16, 0.11)}
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {hw.toFixed(2)}x{hd.toFixed(2)}m
                </text>

                {isSelected && !obj.locked && (
                  <g
                    transform={`translate(0, ${-hd / 2 - 0.25})`}
                    style={{ cursor: "crosshair" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setRotatingObjectId(obj.id);
                    }}
                  >
                    <line x1={0} y1={0.25} x2={0} y2={0} stroke="#63b3ed" strokeWidth={0.02} strokeDasharray="0.04 0.02" />
                    <circle r={0.08} fill="#3182ce" stroke="#ffffff" strokeWidth={0.02} />
                  </g>
                )}
              </g>
            );
          })}

          {selectedObject && (
            <g pointerEvents="none">
              {(() => {
                const [hx, hz] = footprintHalfExtents(selectedObject);
                const x = selectedObject.position[0];
                const z = selectedObject.position[2];
                const dLeft = Math.max(0, x - hx);
                const dRight = Math.max(0, room.width - (x + hx));
                const dTop = Math.max(0, z - hz);
                const dBottom = Math.max(0, room.depth - (z + hz));

                return (
                  <>
                    <line x1={0} y1={z} x2={x - hx} y2={z} stroke="#e2e8f0" strokeWidth={0.015} strokeDasharray="0.05 0.03" />
                    <text x={(x - hx) / 2} y={z - 0.05} fill="#e2e8f0" fontSize={0.12} textAnchor="middle">
                      {dLeft.toFixed(2)} m
                    </text>

                    <line x1={x + hx} y1={z} x2={room.width} y2={z} stroke="#e2e8f0" strokeWidth={0.015} strokeDasharray="0.05 0.03" />
                    <text x={x + hx + dRight / 2} y={z - 0.05} fill="#e2e8f0" fontSize={0.12} textAnchor="middle">
                      {dRight.toFixed(2)} m
                    </text>

                    <line x1={x} y1={0} x2={x} y2={z - hz} stroke="#e2e8f0" strokeWidth={0.015} strokeDasharray="0.05 0.03" />
                    <text x={x + 0.08} y={(z - hz) / 2} fill="#e2e8f0" fontSize={0.12} textAnchor="start">
                      {dTop.toFixed(2)} m
                    </text>

                    <line x1={x} y1={z + hz} x2={x} y2={room.depth} stroke="#e2e8f0" strokeWidth={0.015} strokeDasharray="0.05 0.03" />
                    <text x={x + 0.08} y={z + hz + dBottom / 2} fill="#e2e8f0" fontSize={0.12} textAnchor="start">
                      {dBottom.toFixed(2)} m
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          <g pointerEvents="none">
            <line x1={0} y1={-0.35} x2={room.width} y2={-0.35} stroke={COTA_COLOR} strokeWidth={0.02} />
            <line x1={0} y1={-0.45} x2={0} y2={-0.25} stroke={COTA_COLOR} strokeWidth={0.02} />
            <line x1={room.width} y1={-0.45} x2={room.width} y2={-0.25} stroke={COTA_COLOR} strokeWidth={0.02} />
            <text x={room.width / 2} y={-0.45} fill={COTA_COLOR} fontSize={0.2} textAnchor="middle" fontWeight="bold">
              {room.width.toFixed(2)} m
            </text>

            <line x1={-0.35} y1={0} x2={-0.35} y2={room.depth} stroke={COTA_COLOR} strokeWidth={0.02} />
            <line x1={-0.45} y1={0} x2={-0.25} y2={0} stroke={COTA_COLOR} strokeWidth={0.02} />
            <line x1={-0.45} y1={room.depth} x2={-0.25} y2={room.depth} stroke={COTA_COLOR} strokeWidth={0.02} />
            <text
              x={-0.45}
              y={room.depth / 2}
              fill={COTA_COLOR}
              fontSize={0.2}
              textAnchor="middle"
              fontWeight="bold"
              transform={`rotate(-90, -0.45, ${room.depth / 2})`}
            >
              {room.depth.toFixed(2)} m
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

