import { Injectable } from '@angular/core'
import { GraphComponent, GraphViewerInputMode } from '@yfiles/yfiles'

/**
 * A singleton service that owns the yFiles GraphComponent instance.
 *
 * Why a service?
 * The yFiles GraphComponent is the main view component that visualizes a graph instance.
 * We need a single, stable instance
 * that can be shared across Angular components without prop-drilling.
 * An Angular service with providedIn: 'root' is the natural fit: it
 * plays the same role as a React Context/Provider, but uses Angular's
 * dependency injection system.
 */
@Injectable({ providedIn: 'root' })
export class GraphComponentService {
  private graphComponent!: GraphComponent

  getGraphComponent(): GraphComponent {
    if (!this.graphComponent) {
      this.graphComponent = new GraphComponent()

      // GraphViewerInputMode enables pan and zoom but no editing.
      // We will switch to GraphEditorInputMode in a later chapter.
      this.graphComponent.inputMode = new GraphViewerInputMode()
    }
    return this.graphComponent
  }
}
