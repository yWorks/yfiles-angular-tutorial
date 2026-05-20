# Chapter 5: Layout in a Web Worker

## What you'll build

The same styled microservices graph as chapter 4, but with the layout
algorithm running in a **dedicated web worker** instead of the main thread.
The graph behaviour is identical — what changes is where the computation
happens.

---

## Prerequisites

Completed [Chapter 4](../04-styles-and-interaction/README.md). This chapter
is a focused modification to `GraphViewComponent`. Everything else — styles,
`GraphComponentService`, `AppComponent`, `ToolbarComponent`,
`InfoPanelComponent` — stays the same.

---

## 1. Why move layout to a worker?

Layout algorithms walk every node and edge, solve geometric constraints, and
can take tens or hundreds of milliseconds on large graphs. Running this work
on the main thread blocks rendering and makes the UI feel sluggish.

Web workers run in a separate thread. Moving layout there gives two concrete
benefits:

1. **Main thread stays free** — Angular can update the view, animations can
   play, and the user can pan/zoom while the layout runs.
2. **Parallelism** — on multi-core hardware the layout genuinely executes
   concurrently with the UI thread.

yFiles provides a purpose-built pair of classes for this pattern:
`LayoutExecutorAsync` (main thread) and `LayoutExecutorAsyncWorker` (worker
thread). They handle serializing the graph, transferring it across the thread
boundary, running the algorithm, and animating the result — with no manual
`postMessage` wiring required.

---

## 2. Configuring the Angular CLI for worker support

Angular CLI needs to know which TypeScript config to use when compiling
worker files.

### `tsconfig.worker.json` (new file at project root)

Workers run in a different global context (`webworker` instead of `dom`).
Create a separate tsconfig:

```json
{
  "extends": "./src/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/out-tsc/worker",
    "lib": ["es2022", "webworker"],
    "types": []
  },
  "include": ["src/**/*.worker.ts"]
}
```

Key settings:

- `"lib": ["es2022", "webworker"]` — removes `dom` types, adds `webworker`
  types (e.g. `self`, `postMessage`)
- `"types": []` — prevents `@types/node` or other packages from bleeding in

### `angular.json` — register the worker tsconfig

Add `"webWorkerTsConfig"` to the build options:

```json
"options": {
  "webWorkerTsConfig": "tsconfig.worker.json",
  "tsConfig": "src/tsconfig.json",
  ...
}
```

### `src/tsconfig.json` — exclude worker files from the main build

```json
{
  "compilerOptions": { ... },
  "exclude": ["src/**/*.worker.ts"]
}
```

Worker files must not be compiled by the main tsconfig — they use `webworker`
globals that the `dom` lib does not declare.

---

## 3. The worker file — `layout.worker.ts`

The worker is a regular TypeScript module. It must:

1. Register the yFiles license (workers have their own isolated global context).
2. Call `LayoutExecutorAsyncWorker.initializeWebWorker()` with a callback
   that applies the layout algorithm.

```ts
// src/app/layout.worker.ts
import { HierarchicalLayout, LayoutExecutorAsyncWorker, LayoutGraph, License } from '@yfiles/yfiles'
import licenseData from '../license.json'

// Workers share no globals with the main thread — set the license here too.
License.value = licenseData

LayoutExecutorAsyncWorker.initializeWebWorker((graph: LayoutGraph) => {
  new HierarchicalLayout().applyLayout(graph)
})
```

### `initializeWebWorker(callback)`

This static method sets up the worker's message listener. When the main
thread sends a layout request, the worker:

1. Deserializes the graph data into a `LayoutGraph`.
2. Passes that graph to your callback.
3. Your callback creates and runs the layout algorithm (`applyLayout(graph)`).
4. The worker serializes the resulting positions and posts them back.

The callback receives a `LayoutGraph` — a lightweight geometric graph used
only by layout algorithms. It does not share any data with the `IGraph` on the
main thread; the serialization layer handles the conversion transparently.

### The license in the worker

Workers run in a completely separate JavaScript realm — they share no globals,
no module cache, and no yFiles state with the main thread. `License.value`
must be set independently in the worker file. Importing the same
`license.json` is fine; the bundler includes it in the worker chunk.

---

## 4. Updating `GraphViewComponent`

The changes from chapter 5 are confined to `GraphViewComponent`. Replace
`LayoutExecutor` with `LayoutExecutorAsync`, and add the worker and executor
as class fields:

```ts
// src/app/graph-view/graph-view.component.ts
import { LayoutExecutorAsync } from '@yfiles/yfiles'

export class GraphViewComponent implements AfterViewInit, OnDestroy {
  // ... existing fields ...

  private worker!: Worker
  private executor!: LayoutExecutorAsync

  ngAfterViewInit(): void {
    // ... mount canvas, initBuilder() ...

    this.initLayoutWorker()

    effect(
      () => {
        this.syncGraph(this.graphData())
      },
      { injector: this.injector },
    )
  }

  private initLayoutWorker(): void {
    // new URL(..., import.meta.url) tells the bundler (webpack) to emit
    // layout.worker.ts as a separate chunk with its own entry point.
    // { type: 'module' } enables ES module syntax inside the worker.
    this.worker = new Worker(new URL('../layout.worker.ts', import.meta.url), { type: 'module' })

    // LayoutExecutorAsync runs on the main thread: it serialises the graph,
    // sends it to the worker, waits for the result, then animates the transition.
    // Create it ONCE and reuse it — see "Why reuse?" below.
    this.executor = new LayoutExecutorAsync({
      messageHandler: LayoutExecutorAsync.createWebWorkerMessageHandler(this.worker),
      graphComponent: this.graphComponent,
      animationDuration: '0.5s',
      animateViewport: true,
    })
  }

  private syncGraph(data: GraphData): void {
    this.builder.setData(this.nodesSource, data.nodesSource)
    this.builder.setData(this.edgesSource, data.edgesSource)
    this.builder.updateGraph()

    // executor.start() replaces the direct LayoutExecutor call from ch4.
    void this.executor.start()
  }
}
```

### `LayoutExecutorAsync.createWebWorkerMessageHandler(worker)`

This static method creates a message handler that routes messages between
`LayoutExecutorAsync` and the `Worker` instance. It abstracts the raw
`postMessage` / `onmessage` wiring into a single call.

```
main thread                              worker thread
───────────────────────────────────────────────────────
LayoutExecutorAsync (reused)             LayoutExecutorAsyncWorker
  .start()                                 .initializeWebWorker(callback)
     │                                           │
     │── serialized graph ──── postMessage ──►   │
     │                                           │ callback(graph)
     │                                           │ layout.applyLayout(graph)
     │◄── serialized result ── postMessage ──    │
     │                                           │
  animate transition
```

### Worker URL — `new URL('../layout.worker.ts', import.meta.url)`

The `new URL(…, import.meta.url)` pattern is the standard way to reference a
worker file so bundlers know to emit it as a separate chunk. Angular CLI's
webpack configuration detects this pattern and:

- Bundles `layout.worker.ts` as a **separate entry point**.
- Emits it as its own JavaScript file in the build output.
- Replaces the `new URL(…)` expression with the correct production URL at
  build time.

The `{ type: 'module' }` option makes the worker a module worker, enabling
ES module `import`/`export` syntax inside the worker file.

### Why reuse the worker and executor?

`LayoutExecutorAsync.createWebWorkerMessageHandler(worker)` registers a
message listener on the `Worker` instance. If you created a new
`LayoutExecutorAsync` on every `syncGraph()` call, multiple competing
listeners would be registered on the same worker — responses would be routed
to the wrong executor and layouts would hang indefinitely.

Creating both the `Worker` and the `LayoutExecutorAsync` once as class fields
(initialized in `initLayoutWorker`) ensures there is exactly one listener
per worker, and both are stable for the lifetime of the component.

### Why not terminate the worker in `ngOnDestroy`?

You might expect `ngOnDestroy` to call `this.worker.terminate()`. In
development, Angular's build tools can recreate modules, and terminating the
worker while the executor still holds a reference to it causes errors.

In a production app you would tie the worker lifetime to the application
lifetime (e.g. in a singleton service), which is naturally terminated when
the page unloads. For this tutorial, we intentionally omit `terminate()` —
the worker thread is garbage-collected when the page closes.

---

## 5. What changed vs chapter 4

| File                                 | Change                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.worker.json`               | **New file** — TypeScript config for worker files                                                                    |
| `angular.json`                       | Adds `"webWorkerTsConfig": "tsconfig.worker.json"`                                                                   |
| `src/tsconfig.json`                  | Adds `"exclude": ["src/**/*.worker.ts"]`                                                                             |
| `src/app/layout.worker.ts`           | **New file** — license + `LayoutExecutorAsyncWorker.initializeWebWorker()`                                           |
| `graph-view/graph-view.component.ts` | Replaces `LayoutExecutor` with `LayoutExecutorAsync`; adds `worker` and `executor` fields; adds `initLayoutWorker()` |
| Everything else                      | **Unchanged**                                                                                                        |

`HierarchicalLayout` is no longer imported on the main thread — it lives
entirely in the worker. The main thread creates the executor once and calls
`executor.start()` on each data change.

---

## Key concepts

| Concept                                 | Summary                                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LayoutExecutorAsync`                   | Main-thread class: serializes the graph, sends it to the worker, waits for results, animates the transition.                                                                           |
| `LayoutExecutorAsyncWorker`             | Worker-thread class: receives the serialized graph, calls your layout callback, returns the result.                                                                                    |
| `initializeWebWorker(callback)`         | Sets up the worker's message listener. Your callback receives a `LayoutGraph` and applies the algorithm.                                                                               |
| `createWebWorkerMessageHandler(worker)` | Creates the message handler connecting the executor to the worker. Call this **once** per worker — multiple calls register competing listeners.                                        |
| `new URL(…, import.meta.url)`           | Tells the bundler to emit the worker file as a separate chunk. Works with Angular CLI (webpack) and Vite alike.                                                                        |
| `{ type: 'module' }`                    | Enables ES module syntax inside the worker. Required when using `import` statements.                                                                                                   |
| `tsconfig.worker.json`                  | Separate TypeScript config for worker files: uses `webworker` lib instead of `dom`.                                                                                                    |
| Worker cleanup                          | `Worker` threads are cleaned up when the page unloads. Do **not** call `terminate()` — in development the build tools may recreate modules and the executor still holds the reference. |
