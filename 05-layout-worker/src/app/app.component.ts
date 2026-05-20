import { Component, signal } from '@angular/core'
import { GraphViewComponent } from './graph-view/graph-view.component'
import { ToolbarComponent } from './toolbar/toolbar.component'
import { GraphData } from './types'
// TypeScript infers string literal types from JSON as plain `string`.
// Casting to GraphData narrows `type` to NodeType as intended.
import initialDataJson from './graph-data.json'
const initialData = initialDataJson as GraphData

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [GraphViewComponent, ToolbarComponent],
})
export class AppComponent {
  graphData = signal<GraphData>(initialData)

  addService(): void {
    this.graphData.update((current) => {
      const newId = Math.max(...current.nodesSource.map((n) => n.id)) + 1
      return {
        nodesSource: [
          ...current.nodesSource,
          { id: newId, name: `Service ${newId}`, type: 'service' },
        ],
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
