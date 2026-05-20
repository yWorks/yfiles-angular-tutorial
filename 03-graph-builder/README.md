# Chapter 3: Loading Data with GraphBuilder

## What you'll build

A graph that loads its structure from a JSON file and updates live when Angular
signal state changes. Two buttons demonstrate the update cycle:

- **Add Service** — appends a new node to the Angular signal state; the graph
  updates with an animated layout transition
- **Reset** — restores the original dataset

```
           ┌────────┐
           │ Client │
           └───┬────┘
               ▼
   ┌────────────────────────┐
   │       API Gateway      │
   └──┬────────┬─────────┬──┘
      ▼        ▼         ▼
  ┌──────┐ ┌──────┐ ┌─────────┐
  │ Auth │ │ User │ │ Product │  ← click "Add Service" to add more
  └──┬───┘ └──┬───┘ └────┬────┘
     └────────┴─┬────────┘
                ▼
          ┌──────────┐
          │ Database │
          └──────────┘
```

---

## Prerequisites

Completed [Chapter 2](../02-first-graph/README.md). This chapter replaces the
manual `IGraph` calls from chapter 2 with `GraphBuilder` — a declarative
binding layer between your application data and the graph.

---

## 1. Why GraphBuilder?

In chapter 2 we called `graph.createNode()` and `graph.createEdge()` directly.
That is fine for a static, hard-coded graph, but real applications load data
from an API or a file, and that data changes over time.

[`GraphBuilder`](https://docs.yworks.com/yfileshtml/dguide/graph_builder/) solves two problems:

1. **Mapping**: it knows how to turn an array of plain objects into graph
   elements, using a field you specify as the stable identity key.

2. **Incremental updates**: when the data changes, `GraphBuilder.updateGraph()`
   reconciles the graph with the new data — reusing existing nodes and edges
   where possible instead of rebuilding from scratch. This preserves custom
   state (positions, styles) on unchanged items.

---

## 2. The data shape

`GraphBuilder` expects separate arrays for nodes and edges. The JSON file
looks like this:

```json
{
  "nodesSource": [
    { "id": 1, "name": "Client" },
    { "id": 2, "name": "API Gateway" }
  ],
  "edgesSource": [{ "fromNode": 1, "toNode": 2 }]
}
```

The `id` field is used as the stable identity key. The `fromNode`/`toNode`
fields reference node IDs, not array indices — the builder resolves them.

Define the corresponding TypeScript types in `src/app/types.ts`:

```ts
export interface NodeData {
  id: number
  name: string
}

export interface EdgeData {
  fromNode: number
  toNode: number
}

export interface GraphData {
  nodesSource: NodeData[]
  edgesSource: EdgeData[]
}
```

---

## 3. Setting up the GraphBuilder

Create a `GraphBuilder` that operates on the `IGraph` from the `GraphComponent`.
Then register node and edge _sources_ — these describe how to read your data:

```ts
this.builder = new GraphBuilder(this.graphComponent.graph)

// Arg 1: data array (starts empty; we provide data via setData())
// Arg 2: stable ID accessor — used by GraphBuilder to match items to nodes
this.nodesSource = this.builder.createNodesSource<NodeData>([], (item) => item.id)

// Bind the node's visible label text to the 'name' field.
this.nodesSource.nodeCreator.createLabelBinding((item) => item.name)

// Arg 2/3: resolve source and target node by ID
this.edgesSource = this.builder.createEdgesSource<EdgeData>(
  [],
  (item) => item.fromNode,
  (item) => item.toNode,
)
```

### Why start with empty arrays?

We pass `[]` so we can always use the same `setData()` + `updateGraph()`
path — whether it is the first render or a later update. Starting empty keeps
the flow uniform.

---

## 4. The build / update cycle

Once the sources are registered, populating or updating the graph is a
two-step call:

```ts
// Replace the data on each source …
this.builder.setData(this.nodesSource, graphData.nodesSource)
this.builder.setData(this.edgesSource, graphData.edgesSource)

// … then reconcile the graph with the new data.
this.builder.updateGraph()
```

**First call** (empty graph): `updateGraph()` acts like `buildGraph()` — it
creates all nodes and edges from the provided data.

**Subsequent calls**: `updateGraph()` performs a diff against what is already
in the graph. Nodes and edges whose IDs are still present are reused; new IDs
cause new elements to be created; missing IDs cause removal.

---

## 5. Angular signals — the reactive state layer

This chapter introduces Angular's **signals API** as the reactive bridge
between application data and the graph.

### `signal<T>()` — mutable reactive state

`signal<T>()` creates a reactive cell. Reading it (by calling it as a
function) tracks the dependency; writing it triggers updates.

```ts
// AppComponent
graphData = signal<GraphData>(initialData)
```

### `input.required<T>()` — signal inputs

Signal inputs are how Angular components receive data from their parent.
The parent binds data with `[graphData]="graphData()"` in the template;
the child declares the input:

```ts
// GraphViewComponent
readonly graphData = input.required<GraphData>()
```

Accessing `this.graphData()` inside an `effect` or `computed` automatically
tracks the dependency — no explicit dependency list needed.

### `effect({ injector })` — reactive side effects

`effect()` runs a function once immediately, then re-runs it automatically
whenever any signal it reads changes:

```ts
effect(
  () => {
    this.syncGraph(this.graphData()) // re-runs when graphData changes
  },
  { injector: this.injector },
)
```

### Why `{ injector: this.injector }`?

`effect()` normally requires an _injection context_ — it must be called from
a constructor or field initializer, where Angular's DI is active. We need to
create it inside `ngAfterViewInit` so that the `GraphBuilder` is initialized
before the effect first fires. Passing `{ injector }` explicitly provides the
injection context from outside the constructor.

The `Injector` is obtained via constructor injection:

```ts
constructor(
  private graphComponentService: GraphComponentService,
  private injector: Injector
) {}
```

---

## 6. `GraphViewComponent` — full implementation

`GraphViewComponent` now holds the `GraphBuilder` as a class field,
initialized once in `ngAfterViewInit`:

```ts
@Component({ selector: 'app-graph-view', ... })
export class GraphViewComponent implements AfterViewInit {
  @ViewChild('graphContainer') graphContainerRef!: ElementRef<HTMLDivElement>

  readonly graphData = input.required<GraphData>()

  private graphComponent!: GraphComponent
  private builder!: GraphBuilder
  private nodesSource!: NodesSource<NodeData>
  private edgesSource!: EdgesSource<EdgeData>

  constructor(
    private graphComponentService: GraphComponentService,
    private injector: Injector
  ) {}

  ngAfterViewInit(): void {
    this.graphComponent = this.graphComponentService.getGraphComponent()

    const div = this.graphComponent.htmlElement
    div.style.width = '100%'
    div.style.height = '100%'
    this.graphContainerRef.nativeElement.appendChild(div)

    this.graphComponent.graph.nodeDefaults.size = new Size(140, 40)

    this.initBuilder()

    // Effect created AFTER builder is initialized.
    effect(() => {
      this.syncGraph(this.graphData())
    }, { injector: this.injector })
  }

  private initBuilder(): void {
    this.builder = new GraphBuilder(this.graphComponent.graph)
    this.nodesSource = this.builder.createNodesSource<NodeData>([], (item) => item.id)
    this.nodesSource.nodeCreator.createLabelBinding((item) => item.name)
    this.edgesSource = this.builder.createEdgesSource<EdgeData>(
      [],
      (item) => item.fromNode,
      (item) => item.toNode
    )
  }

  private syncGraph(data: GraphData): void {
    this.builder.setData(this.nodesSource, data.nodesSource)
    this.builder.setData(this.edgesSource, data.edgesSource)
    this.builder.updateGraph()
    void applyLayout(this.graphComponent)
  }
}

async function applyLayout(graphComponent: GraphComponent): Promise<void> {
  await new LayoutExecutor({
    graphComponent,
    layout: new HierarchicalLayout(),
    animationDuration: '0.5s',
    animateViewport: true,
  }).start()
}
```

`animationDuration: '0.5s'` makes nodes smoothly transition to their new
positions on every update — including when "Add Service" adds a new node and
the layout recalculates.

### Why class fields?

Angular component instances live for the full component lifecycle — from
`ngAfterViewInit` until `ngOnDestroy`. Class fields initialized once in
`ngAfterViewInit` are created exactly once and reused for the entire lifetime
of the component.

---

## 7. Angular integration: signal state in `AppComponent`

`graphData` is **plain Angular signal state**. Every time it changes,
`GraphViewComponent`'s `effect` syncs it to the graph automatically.

```ts
// src/app/app.component.ts
export class AppComponent {
  graphData = signal<GraphData>(initialData)

  addService(): void {
    this.graphData.update((current) => {
      const newId = Math.max(...current.nodesSource.map((n) => n.id)) + 1
      return {
        nodesSource: [...current.nodesSource, { id: newId, name: `Service ${newId}` }],
        edgesSource: [
          ...current.edgesSource,
          { fromNode: 2, toNode: newId },
          { fromNode: newId, toNode: 6 },
        ],
      }
    })
  }

  reset(): void {
    this.graphData.set(initialData)
  }
}
```

The template:

```html
<div class="toolbar">
  <button (click)="addService()">Add Service</button>
  <button (click)="reset()">Reset</button>
</div>
<div class="graph-area">
  <app-graph-view [graphData]="graphData()" />
</div>
```

The graph update — including the animated layout — follows automatically.
`AppComponent` never touches `IGraph` directly in its event handlers.

### TypeScript caveat: JSON imports are widened

When importing JSON directly, TypeScript infers string fields as `string`
rather than their literal union types. The `type` field we add in the next
chapter would be inferred as `string`, not `NodeType`. The fix is to cast:

```ts
import initialDataJson from './graph-data.json'
import type { GraphData } from './types'

const initialData = initialDataJson as GraphData
```

---

## Key concepts

| Concept                                 | Summary                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `GraphBuilder`                          | Declarative bridge between data arrays and the graph model.                         |
| `createNodesSource(data, idProvider)`   | Registers a nodes data array and its ID accessor.                                   |
| `createEdgesSource(data, srcId, tgtId)` | Registers an edges data array and its endpoint accessors.                           |
| `createLabelBinding(fn)`                | Maps a data field to a node/edge label.                                             |
| `setData(source, newArray)`             | Replaces the data on a registered source before an update.                          |
| `updateGraph()`                         | Reconciles the graph with the current data. Incremental on repeat calls.            |
| `signal<T>()`                           | Reactive state cell. Reading it tracks the dependency; writing it triggers updates. |
| `input.required<T>()`                   | Signal input — receives data bound from the parent template.                        |
| `effect(() => ..., {injector})`         | Runs a side effect immediately and re-runs it when any signal it reads changes.     |
| Class fields in `ngAfterViewInit`       | Initialized once for the component's lifetime; created after the template is ready. |

---

## Next chapter

[Chapter 4: Styles and Interaction →](../04-styles-and-interaction/README.md)

The graph has been plain grey boxes so far. In the next chapter we'll use
`ShapeNodeStyle` and `PolylineEdgeStyle` to give nodes and edges distinct
visual identities, bind style properties to data fields, and add click
feedback with an overlay panel.
