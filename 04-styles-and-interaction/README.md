# Chapter 4: Styles and Interaction

## What you'll build

The same microservices graph as chapter 3, now with data-driven visual styles
and interactive click feedback:

- Each node category gets a distinct shape and color
- Edges get a clean arrow style with rounded bends
- Clicking a node or edge shows an overlay panel with item details
- A toolbar provides zoom controls without threading the `GraphComponent` through inputs

| Node type  | Shape           | Color          |
| ---------- | --------------- | --------------- |
| `client`   | rectangle       | blue `#3d72c8`  |
| `gateway`  | round-rectangle | amber `#e08c00` |
| `service`  | hexagon         | teal `#56926e`  |
| `database` | ellipse         | red `#c84b3d`   |

---

## Prerequisites

Completed [Chapter 3](../03-graph-builder/README.md). New concepts in this
chapter are yFiles style APIs, toolbar commands, and bridging yFiles events
to Angular signals.

---

## 1. Extending the data model

Add a `type` discriminator to `NodeData` in `src/app/types.ts`:

```ts
export type NodeType = 'client' | 'gateway' | 'service' | 'database'

export interface NodeData {
  id: number
  name: string
  type: NodeType // ← new
}
```

Add the field to every node in `graph-data.json`:

```json
{ "id": 1, "name": "Client",      "type": "client"   },
{ "id": 2, "name": "API Gateway", "type": "gateway"  },
{ "id": 3, "name": "Auth Service","type": "service"  }
```

### TypeScript caveat: JSON imports are widened

TypeScript infers the `type` field of a JSON import as `string`, not
`NodeType`. Cast the import when using it as typed data:

```ts
import initialDataJson from './graph-data.json'
import type { GraphData } from './types'

// TypeScript infers string literal types from JSON as plain `string`.
// Cast to the typed interface to restore the union type.
const initialData = initialDataJson as GraphData
```

---

## 2. Style factories — `styles.ts`

All style creation is extracted into a single module. This keeps styling
logic separate from component logic.

### Node styles — one factory per type

```ts
// src/app/styles.ts
import { ShapeNodeStyle } from '@yfiles/yfiles'
import type { NodeType } from './types'

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
```

Each entry is a **factory function** — `getNodeStyle()` calls it every time,
returning a _new_ `ShapeNodeStyle` instance. yFiles treats style objects as
potentially mutable: if two nodes share the same instance and you modify it,
both nodes change. Returning a fresh instance per node keeps styles isolated.

### `ShapeNodeStyle` shapes

The `shape` property accepts a string literal. Common values include:

| Value               | Shape                          |
| ------------------- | ------------------------------ |
| `'rectangle'`       | Sharp-cornered rectangle       |
| `'round-rectangle'` | Rectangle with rounded corners |
| `'ellipse'`         | Oval / circle                  |
| `'hexagon'`         | Six-sided polygon              |
| `'diamond'`         | Rotated square                 |

### Edge style

```ts
export function createDefaultEdgeStyle(): PolylineEdgeStyle {
  return new PolylineEdgeStyle({
    stroke: '2px #888888',
    targetArrow: new Arrow({ type: 'triangle', fill: '#888888' }),
    smoothingLength: 20,
  })
}
```

`PolylineEdgeStyle` draws edges as straight or bent lines:

- `stroke` — a CSS-like string: `'<width> <color>'`
- `targetArrow` — an `Arrow` instance at the target end; `type: 'triangle'`
  renders a filled arrowhead
- `smoothingLength` — rounds the corners where edge segments bend

---

## 3. Updating `GraphComponentService`

The service gains two additions in this chapter:

```ts
// src/app/graph-component.service.ts
getGraphComponent(): GraphComponent {
  if (!this.graphComponent) {
    this.graphComponent = new GraphComponent()

    // Apply the shared edge style to all new edges.
    this.graphComponent.graph.edgeDefaults.style = createDefaultEdgeStyle()

    const inputMode = new GraphViewerInputMode()

    // Clicking the empty canvas clears the focused item (deselects).
    // This fires 'current-item-changed', which GraphViewComponent picks up.
    inputMode.addEventListener('canvas-clicked', () => {
      this.graphComponent.currentItem = null
    })

    this.graphComponent.inputMode = inputMode
  }
  return this.graphComponent
}
```

`graph.edgeDefaults.style` is applied to every new edge unless overridden. Node
body styles are **not** set as a default here because each node needs a different
style based on its `type` — that is handled by `styleProvider` next.

---

## 4. Data-driven node styles — `styleProvider`

In `GraphViewComponent.initBuilder()`, set a `styleProvider` on the node
creator:

```ts
this.nodesSource.nodeCreator.styleProvider = (item) => getNodeStyle(item.type)
```

`styleProvider` is a function called by `GraphBuilder`:

- **on creation** — when a new node is added to the graph
- **on update** — when `updateGraph()` is called and the item's data changed

It receives the raw data item (`NodeData`) and returns a `ShapeNodeStyle`
instance. Because `getNodeStyle` returns a new instance each time, every
node gets its own style object — changes to one node's style never leak to
another.

---

## 5. Storing data on items — `tagProvider`

Before we can read data from a clicked item, the data must be _on_ the item.
The `tagProvider` stores the full source data object on each node's `tag`
property:

```ts
this.nodesSource.nodeCreator.tagProvider = (item) => item
```

`tagProvider` is called once per item when the graph is built (and again on
`updateGraph()` if the item's data changed). Setting it to `(item) => item`
stores the entire `NodeData` object, making every field accessible from
`node.tag` later.

---

## 6. `ToolbarComponent` — DI in action

`ToolbarComponent` injects `GraphComponentService` directly — no `@Input()`
needed, no component hierarchy to thread through:

```ts
// src/app/toolbar/toolbar.component.ts
@Component({ selector: 'app-toolbar', ... })
export class ToolbarComponent {
  constructor(private graphComponentService: GraphComponentService) {}

  zoomIn(): void {
    this.graphComponentService.getGraphComponent().executeCommand(Command.INCREASE_ZOOM)
  }

  zoomOut(): void {
    this.graphComponentService.getGraphComponent().executeCommand(Command.DECREASE_ZOOM)
  }

  resetZoom(): void {
    this.graphComponentService.getGraphComponent().executeCommand(Command.ZOOM, 1)
  }

  fit(): void {
    void this.graphComponentService.getGraphComponent().fitGraphBounds({ animated: true })
  }
}
```

`Command.INCREASE_ZOOM` / `DECREASE_ZOOM` / `ZOOM` are built-in yFiles
commands executed via `graphComponent.executeCommand()`. `fitGraphBounds()`
pans and zooms the viewport to make all graph content visible.

---

## 7. Click feedback — bridging yFiles events to Angular signals

### The bridge pattern

`GraphComponent.currentItem` holds the last item the user clicked. yFiles
fires a `'current-item-changed'` event whenever it changes.

In `GraphViewComponent`, we bridge this imperative event to an Angular signal:

```ts
// In ngAfterViewInit, after mounting the canvas:
this.graphComponent.addEventListener('current-item-changed', this.onCurrentItemChanged)

private readonly onCurrentItemChanged = (): void => {
  this.currentItem.set(this.graphComponent.currentItem)
}
```

A signal holds the result:

```ts
currentItem = signal<IModelItem | null>(null)
```

And we clean up in `ngOnDestroy`:

```ts
ngOnDestroy(): void {
  this.graphComponent?.removeEventListener('current-item-changed', this.onCurrentItemChanged)
}
```

The standard pattern for imperative events in Angular: register the listener
in `ngAfterViewInit`, update a signal in the callback, remove the listener in
`ngOnDestroy`.

### `InfoPanelComponent` — `computed` for derived data

`InfoPanelComponent` receives the current item as a signal input and uses
`computed()` to derive display data:

```ts
// src/app/info-panel/info-panel.component.ts
export class InfoPanelComponent {
  readonly item = input<IModelItem | null>(null)

  // computed() re-evaluates automatically whenever item() changes.
  readonly nodeData = computed<NodeData | null>(() => {
    const item = this.item()
    return item instanceof INode ? (item.tag as NodeData) : null
  })

  readonly edgeInfo = computed<{ sourceName: string; targetName: string } | null>(() => {
    const item = this.item()
    if (item instanceof IEdge) {
      return {
        sourceName: (item.sourceNode!.tag as NodeData).name,
        targetName: (item.targetNode!.tag as NodeData).name,
      }
    }
    return null
  })
}
```

`instanceof INode` and `instanceof IEdge` work for runtime type narrowing —
yFiles interfaces support `instanceof` checks.

The panel template uses Angular's `@if` block syntax:

```html
@if (nodeData(); as node) {
<p>You clicked on <strong>{{ node.name }}</strong> ({{ node.type }})</p>
} @else if (edgeInfo(); as edge) {
<p>Connection: <strong>{{ edge.sourceName }}</strong> → <strong>{{ edge.targetName }}</strong></p>
}
```

### Positioning

`InfoPanelComponent` uses `position: absolute` so it overlays the canvas.
`GraphViewComponent` must have `position: relative` on its `:host` to be the
positioning ancestor:

```css
/* graph-view.component.css */
:host {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
}
```

Without `position: relative` on the parent, the absolute-positioned overlay
would escape to the nearest positioned ancestor in the page layout.

---

## 8. What changed vs chapter 3

| File                                   | Change                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `types.ts`                             | Added `NodeType`, added `type` to `NodeData`                                           |
| `graph-data.json`                      | Added `"type"` field to each node                                                      |
| `styles.ts`                            | **New file** — all style factory functions                                             |
| `graph-component.service.ts`           | Adds `canvas-clicked` listener; sets edge defaults from `styles.ts`                    |
| `graph-view/graph-view.component.ts`   | Adds `styleProvider`, `tagProvider`, `currentItem` signal, event listener, `OnDestroy` |
| `graph-view/graph-view.component.css`  | Adds `position: relative` to `:host`                                                   |
| `graph-view/graph-view.component.html` | Renders `<app-info-panel>`                                                             |
| `info-panel/`                          | **New component** — click feedback overlay                                             |
| `toolbar/`                             | **New component** — zoom controls using DI                                             |
| `app.component.ts`                     | Uses `ToolbarComponent`; casts JSON import; adds `type` when creating dynamic nodes    |

---

## Key concepts

| Concept                                 | Summary                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ShapeNodeStyle`                        | Renders a node as a filled shape with a stroke border.                                                                       |
| `PolylineEdgeStyle`                     | Renders an edge as a polyline with optional arrowheads.                                                                      |
| `Arrow`                                 | An arrowhead placed at either end of an edge.                                                                                |
| `graph.edgeDefaults.style`              | Default style applied to all newly created edges.                                                                            |
| `nodeCreator.styleProvider`             | Per-item style factory called by `GraphBuilder` on create and update.                                                        |
| `nodeCreator.tagProvider`               | Stores the source data object on a node's `tag` for later retrieval.                                                         |
| `Command`                               | Built-in yFiles commands for zoom, fit, select-all, etc.                                                                     |
| `fitGraphBounds()`                      | Animates the viewport to show all graph content.                                                                             |
| `graphComponent.currentItem`            | The item the user last clicked (`IModelItem \| null`).                                                                       |
| `'current-item-changed'` event          | Fires when the user clicks a different graph element. Bridge to Angular signal with `addEventListener` in `ngAfterViewInit`. |
| `'canvas-clicked'` event                | Fires on `GraphViewerInputMode` when the user clicks empty canvas.                                                           |
| `instanceof INode` / `instanceof IEdge` | yFiles interfaces support `instanceof` for runtime type narrowing.                                                           |
| `computed()`                            | Derives a value from signals. Re-evaluates automatically when any dependency changes.                                        |

---

## Next chapter

[Chapter 5: Layout in a Web Worker →](../05-layout-worker/README.md)

Hierarchical layout works well for small graphs, but running it on the main
thread blocks the UI during computation. The next chapter moves layout
execution into a web worker so the app stays responsive with large datasets.
