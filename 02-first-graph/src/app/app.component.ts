import { AfterViewInit, Component } from '@angular/core'
import { GraphViewComponent } from './graph-view/graph-view.component'
import { GraphComponentService } from './graph-component.service'
import { buildGraph } from './build-graph'
import { GraphComponent, HierarchicalLayout, LayoutExecutor } from '@yfiles/yfiles'

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

    // Populate the graph with nodes and edges.
    // AppComponent.ngAfterViewInit runs after all child views are initialized,
    // so GraphViewComponent has already mounted the canvas at this point.
    buildGraph(graphComponent.graph)

    // Apply a hierarchical layout and animate the viewport to fit the result.
    void applyLayout(graphComponent)
  }
}

/**
 * Runs a HierarchicalLayout on the graph and animates the viewport
 * to fit all content. Returns a Promise so callers can await it if needed.
 *
 * LayoutExecutor handles the full cycle:
 *   1. Serialise the IGraph into a layout graph
 *   2. Run the layout algorithm synchronously
 *   3. Animate nodes/edges from their old positions to the new ones
 *   4. (optionally) animate the viewport to frame all content
 */
async function applyLayout(graphComponent: GraphComponent): Promise<void> {
  await new LayoutExecutor({
    graphComponent,
    layout: new HierarchicalLayout(),
    animationDuration: '0.5s',
    animateViewport: true,
  }).start()
}
