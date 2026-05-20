import { Component } from '@angular/core'
import { Command } from '@yfiles/yfiles'
import { GraphComponentService } from '../graph-component.service'

/**
 * ToolbarComponent provides zoom and fit-to-content controls.
 *
 * It injects GraphComponentService directly — no @Input() needed.
 * This is the Angular equivalent of React's useGraphComponent() hook:
 * both patterns let any component access the shared GraphComponent
 * instance without prop drilling through the component tree.
 */
@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
})
export class ToolbarComponent {
  constructor(private graphComponentService: GraphComponentService) {}

  zoomIn(): void {
    this.graphComponentService.getGraphComponent().executeCommand(Command.INCREASE_ZOOM)
  }

  zoomOut(): void {
    this.graphComponentService.getGraphComponent().executeCommand(Command.DECREASE_ZOOM)
  }

  resetZoom(): void {
    this.graphComponentService.getGraphComponent().executeCommand(Command.ZOOM, 1)
  }

  fit(): void {
    void this.graphComponentService.getGraphComponent().fitGraphBounds({ animated: true })
  }
}
