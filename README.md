# yFiles for HTML + Angular Tutorial

A step-by-step guide for Angular developers who want to build interactive
graph applications with [yFiles for HTML](https://www.yfiles.com/).

Each chapter is a self-contained Angular + TypeScript project. You can
run any chapter independently — just `npm install && npm start` inside its
directory.

---

## Prerequisites

- **Angular** — familiarity with components, services, dependency injection,
  and lifecycle hooks (`ngAfterViewInit`). No prior yFiles knowledge required.
- **Node.js** 18 or later
- A yFiles for HTML license (evaluation or commercial).

---

## Installing the yFiles Library

yFiles for HTML is distributed as a local npm package, a `.tgz` file. See the [Working with the yFiles npm Module](https://docs.yworks.com/yfileshtml/dguide/yfiles_npm_module/) Developer's Guide for in-depth information.

The subprojects that make up this tutorial are part of an npm workspace, so yFiles only has to be installed once in the toplevel folder:

```shell
# Enter the correct path to your yFiles tgz found in your extracted yFiles for HTML package 
npm install ./path/to/yfiles-<yFilesVersion>+dev.tgz
```

This will replace the placeholder entry for the yFiles dependency in the package.json with the correct path and make the yFiles library and TypeScript typings available in all subprojects.

---

## The yFiles license

yFiles requires a valid license at runtime. The tutorial steps expect the `license.json` to be available in the `src` folder.

Therefore, make sure to copy your yFiles for HTML data to a `license.json` file in the `src` folder of each tutorial step that you want to try out.

See also the Developer's Guide section on [Licensing](https://docs.yworks.com/yfileshtml/dguide/licensing/).

---

## Chapters

Each chapter builds directly on the previous one. The diff between consecutive
chapters is intentionally small so each new concept stands out clearly.

### [1. Setup](./01-setup/README.md)

Mount a yFiles `GraphComponent` inside an Angular app using a
**Service + Dependency Injection architecture** that all subsequent chapters
build on. No data yet — but the canvas will be fully interactive: you can pan
by dragging and zoom with the scroll wheel.

**Introduces:** `GraphComponent`, `GraphComponentService`, `@Injectable`,
`ngAfterViewInit`, `@ViewChild`, `GraphViewerInputMode`, `License`

---

### [2. First Graph](./02-first-graph/README.md)

Build a graph manually using the `IGraph` API — create nodes, add labels,
connect them with edges, and run a hierarchical layout.

**Introduces:** `IGraph`, `createNode`, `createEdge`, `LayoutExecutor`,
`HierarchicalLayout`

---

### [3. GraphBuilder](./03-graph-builder/README.md)

Load a graph from a JSON data file and keep it in sync with Angular signal
state. Add and remove nodes at runtime without touching the graph API directly.

**Introduces:** `GraphBuilder`, `createNodesSource`, `createEdgesSource`,
`setData`, `updateGraph`, `signal`, `input.required`, `effect`

---

### [4. Styles and Interaction](./04-styles-and-interaction/README.md)

Give nodes distinct shapes and colors based on their data type, apply a
global edge style, add a toolbar with zoom controls, and show an overlay
when the user clicks a node or edge.

**Introduces:** `ShapeNodeStyle`, `PolylineEdgeStyle`, `Arrow`,
`nodeCreator.styleProvider`, `nodeCreator.tagProvider`, `edgeDefaults`,
`Command`, `fitGraphBounds`,
`currentItem`, `'current-item-changed'`, `'canvas-clicked'`, `computed`

---

### [5. Layout in a Web Worker](./05-layout-worker/README.md)

Move layout computation off the main thread so the UI stays responsive
during recalculation. Covers the two-class yFiles worker pattern and the
Angular CLI's module worker syntax.

**Introduces:** `LayoutExecutorAsync`, `LayoutExecutorAsyncWorker`,
`initializeWebWorker`, `createWebWorkerMessageHandler`, `webWorkerTsConfig`

---

## Running a chapter

```bash
cd 01-setup   # or any other chapter
npm install
npm start
```

The dev server starts at `http://localhost:4200` by default.

To type-check without running the dev server:

```bash
npx tsc --noEmit -p src/tsconfig.json
```

---

## Next steps

This tutorial provides a concise yet comprehensive introduction to integrating yFiles for HTML into an Angular application.

As a next step, you can explore the [yFiles Angular demo](https://www.yfiles.com/demos/toolkit/angular/), which showcases several interesting features, including:

- A NodeComponentStyle with data binding and zoom-dependent visuals
- Data editing and live visual updates through a properties panel
- Image export to SVG
- A Context menu
- Tooltips

Also check out the [Angular Component Node Style Demo](https://www.yfiles.com/demos/style/angular-component-node-style/) for a more complex style that uses an Angular component and the [Angular Material library](https://material.angular.dev/) to visualize nodes.
