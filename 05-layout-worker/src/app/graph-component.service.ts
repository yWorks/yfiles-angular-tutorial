import { Injectable } from '@angular/core'
import { GraphComponent, GraphItemTypes, GraphViewerInputMode } from '@yfiles/yfiles'
import { createDefaultEdgeStyle } from './styles'

@Injectable({ providedIn: 'root' })
export class GraphComponentService {
  private graphComponent!: GraphComponent

  getGraphComponent(): GraphComponent {
    if (!this.graphComponent) {
      this.graphComponent = new GraphComponent()

      // Apply the shared edge style to all new edges by default.
      this.graphComponent.graph.edgeDefaults.style = createDefaultEdgeStyle()

      const inputMode = new GraphViewerInputMode({
        focusableItems: GraphItemTypes.NODE | GraphItemTypes.EDGE,
      })

      // Clicking the empty canvas clears the focused item (deselects).
      // This mirrors the React tutorial's canvas-clicked handler in
      // GraphComponentProvider.
      inputMode.addEventListener('canvas-clicked', () => {
        this.graphComponent.currentItem = null
      })

      this.graphComponent.inputMode = inputMode
    }
    return this.graphComponent
  }
}
