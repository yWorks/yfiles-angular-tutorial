import { Component, computed, input } from '@angular/core'
import { IEdge, IModelItem, INode } from '@yfiles/yfiles'
import { NodeData } from '../types'

/**
 * InfoPanelComponent displays details about the currently focused graph item.
 *
 * It receives the focused item via a signal input and uses computed() to
 * derive the display data — equivalent to React's derived state or useMemo.
 *
 * The panel is positioned as an absolute overlay inside GraphViewComponent
 * (which has position: relative). It hides itself when no item is focused.
 */
@Component({
  selector: 'app-info-panel',
  templateUrl: './info-panel.component.html',
  styleUrl: './info-panel.component.css',
})
export class InfoPanelComponent {
  readonly item = input<IModelItem | null>(null)

  // computed() re-evaluates whenever item() changes.
  readonly nodeData = computed<NodeData | null>(() => {
    const item = this.item()
    console.log('node')

    return item instanceof INode ? (item.tag as NodeData) : null
  })

  readonly edgeInfo = computed<{ sourceName: string; targetName: string } | null>(() => {
    const item = this.item()
    console.log('edge')

    if (item instanceof IEdge) {
      return {
        sourceName: (item.sourceNode!.tag as NodeData).name,
        targetName: (item.targetNode!.tag as NodeData).name,
      }
    }
    return null
  })
}
