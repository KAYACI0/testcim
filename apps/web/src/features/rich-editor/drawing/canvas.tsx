'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { Arc, Circle, Image as KonvaImage, Layer, Line, Stage, Text } from 'react-konva';

import { renderFunctionGraph } from './function-graph';
import { gridLineColor, selectedColor, strokeColor } from './tokens';
import { useHtmlImage } from './use-html-image';

import type { Scene, SceneObject } from './serialize';
import type { DrawingToolId } from '../types';
import type Konva from 'konva';

import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';

const GRID_SIZE = 10;

function snap(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function nextPointLabel(scene: Scene): string {
  const used = new Set(
    scene.objects
      .filter((o) => o.tool === 'point-label')
      .map((o) => (o as { label: string }).label),
  );
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const letter of letters) {
    if (!used.has(letter)) {
      return letter;
    }
  }
  return `P${scene.objects.length}`;
}

function moveObject(object: SceneObject, dx: number, dy: number): SceneObject {
  switch (object.tool) {
    case 'line':
    case 'arrow':
      return {
        ...object,
        points: [
          object.points[0] + dx,
          object.points[1] + dy,
          object.points[2] + dx,
          object.points[3] + dy,
        ],
      };
    case 'polygon':
      return { ...object, points: object.points.map((n, i) => (i % 2 === 0 ? n + dx : n + dy)) };
    case 'measurement':
    case 'equal-length-mark':
      return {
        ...object,
        x1: object.x1 + dx,
        y1: object.y1 + dy,
        x2: object.x2 + dx,
        y2: object.y2 + dy,
      };
    case 'coordinate-plane':
    case 'function-graph':
      return { ...object, x: object.x + dx, y: object.y + dy };
    default:
      return { ...object, x: object.x + dx, y: object.y + dy };
  }
}

function GridBackground({ width, height }: { width: number; height: number }) {
  const lines: number[][] = [];
  for (let x = 0; x <= width; x += GRID_SIZE) lines.push([x, 0, x, height]);
  for (let y = 0; y <= height; y += GRID_SIZE) lines.push([0, y, width, y]);
  return (
    <>
      {lines.map((points, i) => (
        <Line key={i} points={points} stroke={gridLineColor()} strokeWidth={1} listening={false} />
      ))}
    </>
  );
}

function ObjectShape({
  object,
  selected,
  draggable,
  onSelect,
  onDragEnd,
  onDblClick,
}: {
  object: SceneObject;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragEnd: (dx: number, dy: number) => void;
  onDblClick: () => void;
}) {
  const graphImage = useHtmlImage(object.tool === 'function-graph' ? object.imageDataUrl : '');
  const common = {
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick,
    stroke: selected ? selectedColor() : strokeColor(),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEnd(e.target.x(), e.target.y());
      e.target.position({ x: 0, y: 0 });
    },
  };

  switch (object.tool) {
    case 'line':
    case 'arrow':
      return (
        <Line
          {...common}
          points={object.points}
          strokeWidth={1.5}
          pointerLength={object.tool === 'arrow' ? 8 : 0}
          pointerWidth={object.tool === 'arrow' ? 8 : 0}
        />
      );
    case 'polygon':
      return <Line {...common} points={object.points} closed strokeWidth={1.5} />;
    case 'circle':
      return (
        <Circle {...common} x={object.x} y={object.y} radius={object.radius} strokeWidth={1.5} />
      );
    case 'arc':
    case 'angle-mark':
      return (
        <Arc
          {...common}
          x={object.x}
          y={object.y}
          innerRadius={object.radius}
          outerRadius={object.radius}
          angle={((object.angleEnd - object.angleStart) * 180) / Math.PI}
          rotation={(object.angleStart * 180) / Math.PI}
          strokeWidth={1.5}
        />
      );
    case 'right-angle-mark': {
      const { x, y, size, rotation } = object;
      const p1 = [x + size * Math.cos(rotation), y + size * Math.sin(rotation)];
      const p2 = [
        p1[0]! + size * Math.cos(rotation + Math.PI / 2),
        p1[1]! + size * Math.sin(rotation + Math.PI / 2),
      ];
      const p3 = [
        x + size * Math.cos(rotation + Math.PI / 2),
        y + size * Math.sin(rotation + Math.PI / 2),
      ];
      return (
        <Line
          {...common}
          points={[p1[0]!, p1[1]!, p2[0]!, p2[1]!, p3[0]!, p3[1]!]}
          strokeWidth={1.5}
        />
      );
    }
    case 'equal-length-mark': {
      const midX = (object.x1 + object.x2) / 2;
      const midY = (object.y1 + object.y2) / 2;
      const angle = Math.atan2(object.y2 - object.y1, object.x2 - object.x1) + Math.PI / 2;
      const points: number[] = [];
      for (let i = 0; i < object.ticks; i += 1) {
        const offset = (i - (object.ticks - 1) / 2) * 4;
        const cx = midX + offset * Math.cos(angle - Math.PI / 2);
        const cy = midY + offset * Math.sin(angle - Math.PI / 2);
        points.push(
          cx + 5 * Math.cos(angle),
          cy + 5 * Math.sin(angle),
          cx - 5 * Math.cos(angle),
          cy - 5 * Math.sin(angle),
        );
      }
      return (
        <>
          {Array.from({ length: object.ticks }).map((_, i) => (
            <Line key={i} {...common} points={points.slice(i * 4, i * 4 + 4)} strokeWidth={1.5} />
          ))}
        </>
      );
    }
    case 'point-label':
      return (
        <>
          <Circle
            {...common}
            x={object.x}
            y={object.y}
            radius={3}
            fill={selected ? selectedColor() : strokeColor()}
          />
          <Text
            x={object.x + 6}
            y={object.y - 14}
            text={object.label}
            fontSize={13}
            fill={strokeColor()}
            listening={false}
          />
        </>
      );
    case 'measurement': {
      const midX = (object.x1 + object.x2) / 2;
      const midY = (object.y1 + object.y2) / 2;
      return (
        <>
          <Line
            {...common}
            points={[object.x1, object.y1, object.x2, object.y2]}
            strokeWidth={1}
            dash={[4, 3]}
          />
          <Text
            x={midX - 10}
            y={midY - 18}
            text={object.label}
            fontSize={12}
            fill={strokeColor()}
            listening={false}
          />
        </>
      );
    }
    case 'coordinate-plane': {
      const { x, y, width, height, step } = object;
      const lines: number[][] = [];
      for (let gx = x; gx <= x + width; gx += step) lines.push([gx, y, gx, y + height]);
      for (let gy = y; gy <= y + height; gy += step) lines.push([x, gy, x + width, gy]);
      return (
        <>
          {lines.map((points, i) => (
            <Line
              key={i}
              points={points}
              stroke={gridLineColor()}
              strokeWidth={0.75}
              listening={i === 0}
              onClick={onSelect}
            />
          ))}
          <Line
            points={[x, y + height / 2, x + width, y + height / 2]}
            stroke={strokeColor()}
            strokeWidth={1.25}
            listening={false}
          />
          <Line
            points={[x + width / 2, y, x + width / 2, y + height]}
            stroke={strokeColor()}
            strokeWidth={1.25}
            listening={false}
          />
        </>
      );
    }
    case 'function-graph':
      return graphImage ? (
        <KonvaImage
          {...common}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          image={graphImage}
        />
      ) : null;
    case 'text':
      return (
        <Text
          {...common}
          x={object.x}
          y={object.y}
          text={object.text}
          fontSize={14}
          fill={strokeColor()}
        />
      );
    default:
      return null;
  }
}

export interface DrawingCanvasProps {
  readonly scene: Scene;
  readonly onChange: (scene: Scene) => void;
}

/**
 * Testcim's own geometry canvas (docs/prompts/07 §4): Konva-based, snap-to-
 * grid, undo/redo, copy/paste, layer order. Two-point tools use a
 * down-move-up drag; single-click tools commit immediately. `function-graph`
 * hands off to JSXGraph offscreen (function-graph.ts) and stores the result
 * as a locked raster — see that module's doc comment for why.
 */
export function DrawingCanvas({ scene, onChange }: DrawingCanvasProps) {
  const t = useTranslations('richEditor.drawing');
  const historyRef = useRef<Scene[]>([]);
  const futureRef = useRef<Scene[]>([]);
  const clipboardRef = useRef<SceneObject | null>(null);
  const draftStartRef = useRef<{ x: number; y: number } | null>(null);
  const polygonPointsRef = useRef<number[]>([]);

  const [tool, setTool] = useState<DrawingToolId>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SceneObject | null>(null);
  const [graphForm, setGraphForm] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [graphExpr, setGraphExpr] = useState('sin(x)');
  // Mirror the ref-held stacks so `disabled` below can react to them —
  // reading `.current.length` straight in JSX is a lint violation
  // (react-hooks/refs: refs must not be read during render).
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(false);

  const commit = useCallback(
    (next: Scene) => {
      historyRef.current.push(scene);
      futureRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      onChange(next);
    },
    [scene, onChange],
  );

  function addObject(object: SceneObject) {
    commit({ ...scene, objects: [...scene.objects, object] });
  }

  function undo() {
    const previous = historyRef.current.pop();
    if (!previous) return;
    futureRef.current.push(scene);
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
    onChange(previous);
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(scene);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    onChange(next);
  }

  function removeSelected() {
    if (!selectedId) return;
    commit({ ...scene, objects: scene.objects.filter((o) => o.id !== selectedId) });
    setSelectedId(null);
  }

  function copySelected() {
    const object = scene.objects.find((o) => o.id === selectedId);
    if (object) {
      clipboardRef.current = object;
      setHasClipboard(true);
    }
  }

  function pasteClipboard() {
    const source = clipboardRef.current;
    if (!source) return;
    const id = crypto.randomUUID();
    const moved = { ...moveObject(source, 20, 20), id };
    addObject(moved);
    setSelectedId(id);
  }

  function moveLayer(direction: 1 | -1) {
    const index = scene.objects.findIndex((o) => o.id === selectedId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= scene.objects.length) return;
    const objects = [...scene.objects];
    const [moved] = objects.splice(index, 1);
    objects.splice(target, 0, moved!);
    commit({ ...scene, objects });
  }

  function pointerPos(stage: Konva.Stage) {
    const pos = stage.getPointerPosition();
    return pos ? { x: snap(pos.x), y: snap(pos.y) } : { x: 0, y: 0 };
  }

  function handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    const stage = event.target.getStage();
    if (!stage) return;
    if (event.target === stage) setSelectedId(null);
    const { x, y } = pointerPos(stage);
    const id = crypto.randomUUID();

    switch (tool) {
      case 'line':
      case 'arrow':
        draftStartRef.current = { x, y };
        setDraft({ id, tool, points: [x, y, x, y] });
        break;
      case 'measurement':
        draftStartRef.current = { x, y };
        setDraft({ id, tool, x1: x, y1: y, x2: x, y2: y, label: '' });
        break;
      case 'equal-length-mark':
        draftStartRef.current = { x, y };
        setDraft({ id, tool, x1: x, y1: y, x2: x, y2: y, ticks: 1 });
        break;
      case 'circle':
        draftStartRef.current = { x, y };
        setDraft({ id, tool, x, y, radius: 0 });
        break;
      case 'arc':
      case 'angle-mark':
        draftStartRef.current = { x, y };
        setDraft({ id, tool, x, y, radius: 0, angleStart: 0, angleEnd: 0 });
        break;
      case 'coordinate-plane':
        draftStartRef.current = { x, y };
        setDraft({ id, tool, x, y, width: 0, height: 0, step: 20 });
        break;
      case 'function-graph':
        draftStartRef.current = { x, y };
        setDraft({ id, tool: 'coordinate-plane', x, y, width: 0, height: 0, step: 20 });
        break;
      case 'right-angle-mark':
        addObject({ id, tool, x, y, size: 24, rotation: 0 });
        break;
      case 'point-label':
        addObject({ id, tool, x, y, label: nextPointLabel(scene) });
        break;
      case 'text':
        addObject({ id, tool, x, y, text: t('defaultText') });
        break;
      case 'polygon':
        polygonPointsRef.current.push(x, y);
        setDraft({ id: 'polygon-draft', tool, points: [...polygonPointsRef.current] });
        break;
      default:
        break;
    }
  }

  function handleMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
    const stage = event.target.getStage();
    if (!stage || !draft || !draftStartRef.current) return;
    const { x, y } = pointerPos(stage);
    const start = draftStartRef.current;

    switch (draft.tool) {
      case 'line':
      case 'arrow':
        setDraft({ ...draft, points: [start.x, start.y, x, y] });
        break;
      case 'measurement':
        setDraft({ ...draft, x2: x, y2: y });
        break;
      case 'equal-length-mark':
        setDraft({ ...draft, x2: x, y2: y });
        break;
      case 'circle':
        setDraft({ ...draft, radius: Math.hypot(x - start.x, y - start.y) });
        break;
      case 'arc':
      case 'angle-mark':
        setDraft({
          ...draft,
          radius: Math.hypot(x - start.x, y - start.y),
          angleEnd: Math.atan2(y - start.y, x - start.x),
        });
        break;
      case 'coordinate-plane':
        setDraft({
          ...draft,
          x: Math.min(start.x, x),
          y: Math.min(start.y, y),
          width: Math.abs(x - start.x),
          height: Math.abs(y - start.y),
        });
        break;
      default:
        break;
    }
  }

  function handleMouseUp() {
    if (!draft) return;
    draftStartRef.current = null;

    if (
      tool === 'function-graph' &&
      draft.tool === 'coordinate-plane' &&
      draft.width > 20 &&
      draft.height > 20
    ) {
      setGraphForm({ x: draft.x, y: draft.y, width: draft.width, height: draft.height });
      setDraft(null);
      return;
    }

    const isDegenerate =
      (draft.tool === 'line' || draft.tool === 'arrow') &&
      Math.hypot(draft.points[2] - draft.points[0], draft.points[3] - draft.points[1]) < 2;
    const isTinyBox = draft.tool === 'coordinate-plane' && (draft.width < 10 || draft.height < 10);

    if (!isDegenerate && !isTinyBox) {
      addObject(draft);
    }
    setDraft(null);
  }

  function handleStageDblClick() {
    if (tool === 'polygon' && polygonPointsRef.current.length >= 6) {
      addObject({
        id: crypto.randomUUID(),
        tool: 'polygon',
        points: [...polygonPointsRef.current],
      });
      polygonPointsRef.current = [];
      setDraft(null);
    }
  }

  async function saveFunctionGraph() {
    if (!graphForm) return;
    const imageDataUrl = await renderFunctionGraph({
      expression: graphExpr,
      xMin: -10,
      xMax: 10,
      width: Math.round(graphForm.width),
      height: Math.round(graphForm.height),
    });
    addObject({
      id: crypto.randomUUID(),
      tool: 'function-graph',
      ...graphForm,
      expression: graphExpr,
      xMin: -10,
      xMax: 10,
      imageDataUrl,
    });
    setGraphForm(null);
  }

  const toolOptions = [
    { value: 'select', label: t('toolSelect') },
    { value: 'line', label: t('toolLine') },
    { value: 'arrow', label: t('toolArrow') },
    { value: 'polygon', label: t('toolPolygon') },
    { value: 'circle', label: t('toolCircle') },
    { value: 'arc', label: t('toolArc') },
    { value: 'angle-mark', label: t('toolAngleMark') },
    { value: 'right-angle-mark', label: t('toolRightAngleMark') },
    { value: 'equal-length-mark', label: t('toolEqualLengthMark') },
    { value: 'point-label', label: t('toolPointLabel') },
    { value: 'measurement', label: t('toolMeasurement') },
    { value: 'coordinate-plane', label: t('toolCoordinatePlane') },
    { value: 'function-graph', label: t('toolFunctionGraph') },
    { value: 'text', label: t('toolText') },
  ];

  return (
    <div className="space-y-3">
      <Segmented
        aria-label={t('toolbarAria')}
        className="flex-wrap"
        options={toolOptions}
        value={tool}
        onValueChange={(value) => {
          setTool(value as DrawingToolId);
          setSelectedId(null);
          polygonPointsRef.current = [];
          setDraft(null);
        }}
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={undo} disabled={!canUndo}>
          {t('undo')}
        </Button>
        <Button variant="secondary" size="sm" onClick={redo} disabled={!canRedo}>
          {t('redo')}
        </Button>
        <Button variant="secondary" size="sm" onClick={copySelected} disabled={!selectedId}>
          {t('copy')}
        </Button>
        <Button variant="secondary" size="sm" onClick={pasteClipboard} disabled={!hasClipboard}>
          {t('paste')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => moveLayer(1)} disabled={!selectedId}>
          {t('bringForward')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => moveLayer(-1)} disabled={!selectedId}>
          {t('sendBackward')}
        </Button>
        <Button variant="secondary" size="sm" onClick={removeSelected} disabled={!selectedId}>
          {t('delete')}
        </Button>
      </div>
      <div className="relative w-fit rounded-control border border-line bg-canvas">
        <Stage
          width={scene.width}
          height={scene.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDblClick={handleStageDblClick}
        >
          <Layer>
            <GridBackground width={scene.width} height={scene.height} />
            {scene.objects.map((object) => (
              <ObjectShape
                key={object.id}
                object={object}
                selected={object.id === selectedId}
                draggable={tool === 'select'}
                onSelect={() => setSelectedId(object.id)}
                onDblClick={() => setSelectedId(object.id)}
                onDragEnd={(dx, dy) =>
                  commit({
                    ...scene,
                    objects: scene.objects.map((o) =>
                      o.id === object.id ? moveObject(o, snap(dx), snap(dy)) : o,
                    ),
                  })
                }
              />
            ))}
            {draft && (
              <ObjectShape
                object={draft}
                selected={false}
                draggable={false}
                onSelect={() => {}}
                onDblClick={() => {}}
                onDragEnd={() => {}}
              />
            )}
          </Layer>
        </Stage>
      </div>
      {(() => {
        const selected = scene.objects.find((o) => o.id === selectedId);
        if (!selected) return null;
        const field: 'label' | 'text' | null =
          selected.tool === 'measurement' || selected.tool === 'point-label'
            ? 'label'
            : selected.tool === 'text'
              ? 'text'
              : null;
        if (!field) return null;
        const value =
          selected.tool === 'measurement' || selected.tool === 'point-label'
            ? selected.label
            : selected.tool === 'text'
              ? selected.text
              : '';
        return (
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-2" htmlFor="object-label">
              {t('labelFieldLabel')}
            </label>
            <input
              id="object-label"
              value={value}
              onChange={(event) =>
                commit({
                  ...scene,
                  objects: scene.objects.map((o) =>
                    o.id === selected.id ? { ...o, [field]: event.target.value } : o,
                  ),
                })
              }
              className="w-48 rounded-control border border-line bg-canvas px-2 py-1 text-sm"
            />
          </div>
        );
      })()}
      {graphForm && (
        <div className="flex items-center gap-2 rounded-control border border-line bg-canvas p-2">
          <label className="text-xs text-ink-2" htmlFor="graph-expr">
            {t('graphExpressionLabel')}
          </label>
          <input
            id="graph-expr"
            value={graphExpr}
            onChange={(event) => setGraphExpr(event.target.value)}
            className="w-40 rounded-control border border-line bg-surface px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={() => void saveFunctionGraph()}>
            {t('graphApply')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setGraphForm(null)}>
            {t('cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}
