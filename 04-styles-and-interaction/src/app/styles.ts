import { Arrow, PolylineEdgeStyle, ShapeNodeStyle } from '@yfiles/yfiles'
import type { NodeType } from './types'

// Each entry is a factory function that returns a NEW style instance.
// yFiles requires a separate style object per node — sharing the same
// instance across multiple nodes leads to unexpected visual results.
const NODE_STYLE_FACTORIES: Record<NodeType, () => ShapeNodeStyle> = {
  client: () =>
    new ShapeNodeStyle({ shape: 'rectangle', fill: '#3d72c8', stroke: '1.5px #2855a0' }),
  gateway: () =>
    new ShapeNodeStyle({ shape: 'round-rectangle', fill: '#e08c00', stroke: '1.5px #b06c00' }),
  service: () => new ShapeNodeStyle({ shape: 'hexagon', fill: '#56926e', stroke: '1.5px #3d6b50' }),
  database: () =>
    new ShapeNodeStyle({ shape: 'ellipse', fill: '#c84b3d', stroke: '1.5px #9a3229' }),
}

export function getNodeStyle(type: NodeType): ShapeNodeStyle {
  return NODE_STYLE_FACTORIES[type]()
}

export function createDefaultEdgeStyle(): PolylineEdgeStyle {
  return new PolylineEdgeStyle({
    stroke: '2px #888888',
    targetArrow: new Arrow({ type: 'triangle', fill: '#888888' }),
    smoothingLength: 20,
  })
}
