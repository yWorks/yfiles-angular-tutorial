# Chapter 1: Setting Up an Angular Project with yFiles

## What you'll build

A minimal Angular application that renders an empty yFiles graph canvas using a
**Service + Dependency Injection architecture** that all subsequent chapters
build on. No data yet — but the canvas will be fully interactive: you can pan
by dragging and zoom with the scroll wheel.

---

## Prerequisites

- Node.js 18+ and npm
- A yFiles for HTML license (a `.tgz` package file and a `license.json` file).
  If you are evaluating yFiles, download the evaluation package from the
  [yWorks Customer Center](https://my.yworks.com/).

---

## 1. Scaffold the project

Create a new Angular project with the Angular CLI:

```bash
npm create @angular my-yfiles-app
cd my-yfiles-app
```

The generated project gives you a standard Angular + TypeScript setup.

---

## 2. Install yFiles

yFiles for HTML is distributed as a local npm package, a `.tgz` file. See the [Working with the yFiles npm Module](https://docs.yworks.com/yfileshtml/dguide/yfiles_npm_module/) Developer's Guide section for in-depth information.

If the yFiles dependency has not been set up yet using the toplevel npm workspace, install it:

```shell
# Enter the correct path to your yFiles tgz found in your extracted yFiles for HTML package
npm install ./path/to/yfiles-<yFilesVersion>+dev.tgz
```

Here, we use the development version of the library. Again, the Developer's Guide provides more in-depth information in the [Development Mode](https://docs.yworks.com/yfileshtml/dguide/yfiles_development_mode/) chapter.

After installation, the yFiles TypeScript types are available in `node_modules`
and autocompletion works in your IDE just like any other npm package.

---

## 3. The yFiles license

yFiles requires a valid license at runtime. Without one, the library will throw
an error before rendering anything.

The tutorial apps expect the `license.json` in the `src` folder.

The license is loaded by assigning it to `License.value` **before** any other
yFiles API is called:

```ts
import { License } from '@yfiles/yfiles'
import licenseData from './license.json'

License.value = licenseData
```

See also the Developer's Guide section on [Licensing](https://docs.yworks.com/yfileshtml/dguide/licensing/).

---

## 4. The [`GraphComponent`](https://docs.yworks.com/yfileshtml/api/GraphComponent/)

`GraphComponent` is the central UI element in yFiles. It is **not** an Angular
component; it is a plain DOM element (a `<div>` containing an `<svg>` canvas)
managed entirely by yFiles. yFiles uses its own rendering engine rather than
Angular's change detection.

This means you need to bridge the two worlds: let Angular manage a container
`<div>`, and let yFiles own a child element inside it.

Rather than creating the `GraphComponent` inside a single component, we use
**Angular's dependency injection system** so any component in the app can
access it without threading it through `@Input()` properties.

---

## 5. `GraphComponentService` — creating the service

Create `src/app/graph-component.service.ts`:

```ts
import { Injectable } from '@angular/core'
import { GraphComponent, GraphViewerInputMode } from '@yfiles/yfiles'

@Injectable({ providedIn: 'root' })
export class GraphComponentService {
  private graphComponent!: GraphComponent

  getGraphComponent(): GraphComponent {
    if (!this.graphComponent) {
      this.graphComponent = new GraphComponent()

      // GraphViewerInputMode enables panning, zooming, and item selection,
      // but prevents users from creating or editing graph elements.
      this.graphComponent.inputMode = new GraphViewerInputMode()
    }
    return this.graphComponent
  }
}
```

`@Injectable({ providedIn: 'root' })` registers the service in the root
injector, making it a **singleton** across the entire application. Any
component that injects `GraphComponentService` receives the same instance.

### Why lazy initialization?

`getGraphComponent()` creates the `GraphComponent` on the first call and
returns the same instance on every subsequent call. The factory runs once
and the result is reused.

Creating `GraphComponent` just allocates memory — it does not need DOM access.
We initialize it lazily rather than in the constructor so that it is only
created when actually needed.

### `GraphViewerInputMode`

Setting `inputMode = new GraphViewerInputMode()` enables panning, zooming,
and item selection while **preventing users from creating or editing graph
elements**. Always use a viewer input mode when displaying read-only data;
without it, the default `GraphEditorInputMode` lets users drag nodes and draw
edges.

---

## 6. `GraphViewComponent` — mounting the canvas

Create `src/app/graph-view/graph-view.component.ts`:

```ts
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core'
import { GraphComponentService } from '../graph-component.service'

@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrl: './graph-view.component.css',
})
export class GraphViewComponent implements AfterViewInit {
  @ViewChild('graphContainer') graphContainerRef!: ElementRef<HTMLDivElement>

  constructor(private graphComponentService: GraphComponentService) {}

  ngAfterViewInit(): void {
    const graphComponent = this.graphComponentService.getGraphComponent()

    const div = graphComponent.htmlElement
    div.style.width = '100%'
    div.style.height = '100%'
    this.graphContainerRef.nativeElement.appendChild(div)
  }
}
```

The template (`graph-view.component.html`) provides the container:

```html
<div #graphContainer style="width: 100%; height: 100%;"></div>
```

### Why `ngAfterViewInit` and not `ngOnInit`?

`ngOnInit` fires when the component is initialized but **before** the template
is rendered. The `@ViewChild` reference (`graphContainerRef`) points to a
template element that does not exist yet at that point — it would be `undefined`.

`ngAfterViewInit` fires after Angular has rendered the template and all
`@ViewChild` references are populated. DOM manipulation must happen here.

---

## 7. Wire it up in `AppComponent`

`AppComponent` imports `GraphViewComponent` and renders it:

```ts
// src/app/app.component.ts
@Component({
  selector: 'app-root',
  template: '<app-graph-view></app-graph-view>',
  styles: [':host { display: block; width: 100vw; height: 100vh; overflow: hidden; }'],
  imports: [GraphViewComponent],
})
export class AppComponent {}
```

`AppComponent` never touches `GraphComponent` directly — it composes
`GraphViewComponent` and lets it handle the yFiles integration.

The `:host` style sets the app to fill the entire viewport. yFiles sizes its
canvas based on the container dimensions, so an explicit size is required.

---

## 8. Zoneless change detection

Angular's default change detection relies on Zone.js to intercept browser APIs.
Since yFiles fires its own events outside Angular's zone, it is cleaner to
opt in to **zoneless** change detection:

```ts
// src/app/app.config.ts
import { provideZonelessChangeDetection } from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection()],
}
```

With zoneless change detection, Angular only re-evaluates templates when a
signal value changes. This avoids spurious change-detection cycles triggered
by yFiles' internal DOM updates.

---

## 9. Run it

```bash
npm start
```

Open `http://localhost:4200`. You should see a blank white canvas. Try panning
(click and drag) and zooming (scroll wheel) — yFiles enables both by default.

---

## Key concepts

| Concept                               | Summary                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `License.value`                       | Must be set before any yFiles API call.                                                         |
| `GraphComponent`                      | The yFiles GraphComponent is the main view component that visualizes a graph instance.          |
| `GraphComponentService`               | Singleton service that owns the `GraphComponent`. Shared via Angular's dependency injection.    |
| `@Injectable({ providedIn: 'root' })` | Registers the service as a singleton in the root injector.                                      |
| `@ViewChild`                          | Gives access to a template element reference by name.                                           |
| `ngAfterViewInit()`                   | Lifecycle hook that fires after the template is rendered. Use for DOM access.                   |
| `GraphViewerInputMode`                | Read-only interaction: pan, zoom, select. No graph editing.                                     |
| `provideZonelessChangeDetection()`    | Disables Zone.js; Angular only re-evaluates signals. Avoids spurious cycles from yFiles events. |

---

## Next chapter

[Chapter 2: Displaying a Graph →](../02-first-graph/README.md)

In the next chapter we'll use the `IGraph` API to create nodes and edges
programmatically, and apply a layout algorithm to arrange them automatically.
