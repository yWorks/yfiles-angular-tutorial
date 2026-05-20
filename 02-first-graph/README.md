# Chapter 2: Displaying a Graph

## What you'll build

An Angular app that creates a small component-dependency
[graph](https://docs.yworks.com/yfileshtml/dguide/graph/) in code and
arranges it automatically with yFiles'
[`HierarchicalLayout`](https://docs.yworks.com/yfileshtml/dguide/hierarchical_layout/).

---

## Prerequisites

Completed [Chapter 1](../01-setup/README.md). This chapter introduces two new
concepts on top of the empty canvas from chapter 1: the **`IGraph` API** and
**automatic layout**.

---

## 1. The graph model: [`IGraph`](https://docs.yworks.com/yfileshtml/api/IGraph/)

In yFiles, the graph you see on screen is backed by a **graph model** — an
in-memory data structure that holds nodes, edges, labels, and ports.
The model is accessed through the `IGraph` interface.

You get the `IGraph` from the `GraphComponent`:

```ts
const graph: IGraph = graphComponent.graph
```

`IGraph` is also a **factory** — it is the way to create elements that
belong to the graph:

```ts
const node = graph.createNode() // ✅ correct
const node = new INode() // ❌ does not exist
```

In the next chapter, [`GraphBuilder`](https://docs.yworks.com/yfileshtml/dguide/graph_builder/)
is introduced — a higher-level, declarative way to create and update a graph
from data arrays.

---

## 2. Creating nodes

`graph.createNode()` returns an `INode` reference. Hold on to it to connect
nodes with edges later.

### Setting a default size

Instead of specifying the size on every node, set it once on the defaults
object — then all subsequently created nodes use that size:

```ts
graph.nodeDefaults.size = new Size(140, 40)
```

### Adding labels

Use the **options-object overload** to add a label in the same call as node
creation:

```ts
const app = graph.createNode({ labels: ['App'] })
```

---

## 3. Creating edges

`graph.createEdge(source, target)` takes two `INode` references and creates a
directed edge between them:

```ts
graph.createEdge(app, router)
```

The edge's direction (source → target) is used by directional layout algorithms
like `HierarchicalLayout` to determine which node sits "higher" in the
hierarchy.

---

## 4. Separating graph construction from the component

Keep graph-building logic out of the Angular component. Create a separate
`build-graph.ts` module that takes an `IGraph` and populates it:

```ts
// src/app/build-graph.ts
import { IGraph, Size } from '@yfiles/yfiles'

export function buildGraph(graph: IGraph): void {
  graph.nodeDefaults.size = new Size(140, 40)

  const app = graph.createNode({ labels: ['App'] })
  const router = graph.createNode({ labels: ['Router'] })
  const store = graph.createNode({ labels: ['Store'] })
  const apiService = graph.createNode({ labels: ['API Service'] })
  const authService = graph.createNode({ labels: ['Auth Service'] })
  const database = graph.createNode({ labels: ['Database'] })

  graph.createEdge(app, router)
  graph.createEdge(app, store)
  graph.createEdge(app, apiService)
  graph.createEdge(apiService, authService)
  graph.createEdge(apiService, database)
}
```

This function is **framework-agnostic**: it takes an `IGraph` and knows
nothing about Angular. Separating it makes it easy to test and reuse.

---

## 5. Applying a layout

Nodes created with `createNode()` are initially stacked at position `(0, 0)`.
A layout algorithm computes proper positions for all nodes and routes all edges.

yFiles provides the `LayoutExecutor` class to run a layout on a
`GraphComponent`:

```ts
import { GraphComponent, HierarchicalLayout, LayoutExecutor } from '@yfiles/yfiles'

async function applyLayout(graphComponent: GraphComponent): Promise<void> {
  await new LayoutExecutor({
    graphComponent,
    layout: new HierarchicalLayout(),
    animationDuration: '0.5s',
    animateViewport: true,
  }).start()
}
```

- `animationDuration` — how long nodes and edges take to transition to their
  new positions. `'0.5s'` gives a smooth half-second animation.
- `animateViewport` — pans and zooms the viewport to fit all content once the
  layout is complete.

### `HierarchicalLayout`

`HierarchicalLayout` arranges nodes in horizontal or vertical layers, following
the direction of edges. It is well-suited for dependency graphs, flowcharts,
and trees.

### Why async?

Layout algorithms walk every node and edge and can take tens or hundreds of
milliseconds on large graphs. `LayoutExecutor.start()` returns a `Promise`
that resolves when the layout (and any animation) is complete — keeping the
function non-blocking.

We will revisit `LayoutExecutor` in chapter 5, where it is replaced with
`LayoutExecutorAsync` to move computation into a web worker.

---

## 6. Updating `AppComponent`

In chapter 1, `AppComponent` had no logic. Now it injects `GraphComponentService`,
builds the graph, and runs the layout. The work happens in `ngAfterViewInit`
because we need the child `GraphViewComponent` to have mounted the canvas
before we add content to it:

```ts
// src/app/app.component.ts
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [GraphViewComponent],
})
export class AppComponent implements AfterViewInit {
  constructor(private graphComponentService: GraphComponentService) {}

  ngAfterViewInit(): void {
    const graphComponent = this.graphComponentService.getGraphComponent()
    buildGraph(graphComponent.graph)
    void applyLayout(graphComponent)
  }
}
```

The `void` prefix discards the `Promise` — fire-and-forget initialization is
fine here.

### Why `ngAfterViewInit` in the parent?

Angular's lifecycle guarantees that a parent's `ngAfterViewInit` runs after
all child `ngAfterViewInit` hooks have completed. By the time
`AppComponent.ngAfterViewInit` runs, `GraphViewComponent` has already appended
the canvas to the DOM — so it is safe to populate the graph immediately.

---

## 7. `GraphViewComponent` — unchanged

`GraphViewComponent` is identical to chapter 1. It still has one job: mount
the canvas. Graph content is the responsibility of `AppComponent`, not the
view component.

---

## Key concepts

| Concept                      | Summary                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `graphComponent.graph`       | The `IGraph` instance — the graph model.                                                              |
| `graph.createNode()`         | Creates a node. Returns `INode`.                                                                      |
| `graph.createEdge(src, tgt)` | Creates a directed edge. Returns `IEdge`.                                                             |
| `graph.nodeDefaults.size`    | Default size applied to all new nodes.                                                                |
| `LayoutExecutor`             | Runs a layout algorithm, animates nodes to their new positions, and optionally animates the viewport. |
| `HierarchicalLayout`         | Arranges nodes in layers along edge direction.                                                        |
| `ngAfterViewInit` (parent)   | Guaranteed to run after all child `ngAfterViewInit` hooks have completed.                             |

---

## Next chapter

[Chapter 3: Loading Data with GraphBuilder →](../03-graph-builder/README.md)

Hard-coding nodes and edges works for toy examples, but real applications load
data from an API or a JSON file. In the next chapter we'll use `GraphBuilder`
to bind a JSON dataset to the graph declaratively, and update the graph
automatically when the data changes.
