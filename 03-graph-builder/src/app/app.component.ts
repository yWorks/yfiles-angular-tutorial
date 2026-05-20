import { Component, signal } from '@angular/core'
import { GraphViewComponent } from './graph-view/graph-view.component'
import { GraphData } from './types'
import initialData from './graph-data.json'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [GraphViewComponent],
})
export class AppComponent {
  // graphData is an Angular signal — the equivalent of React's useState.
  // Changing it (via .set() or .update()) automatically propagates
  // the new value to any template binding or effect that reads it.
  graphData = signal<GraphData>(initialData)

  addService(): void {
    this.graphData.update((current) => {
      const newId = Math.max(...current.nodesSource.map((n) => n.id)) + 1
      return {
        nodesSource: [...current.nodesSource, { id: newId, name: `Service ${newId}` }],
        edgesSource: [
          ...current.edgesSource,
          { fromNode: 2, toNode: newId }, // API Gateway → new service
          { fromNode: newId, toNode: 6 }, // new service → Database
        ],
      }
    })
  }

  reset(): void {
    this.graphData.set(initialData)
  }
}
