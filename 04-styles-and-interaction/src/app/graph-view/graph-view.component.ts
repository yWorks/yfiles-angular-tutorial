import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  effect,
  input,
  signal,
} from '@angular/core'
import {
  EdgesSource,
  GraphBuilder,
  GraphComponent,
  HierarchicalLayout,
  IModelItem,
  LayoutExecutor,
  NodesSource,
  Size,
} from '@yfiles/yfiles'
import { GraphComponentService } from '../graph-component.service'
import { GraphData, NodeData, EdgeData } from '../types'
import { getNodeStyle } from '../styles'
import { InfoPanelComponent } from '../info-panel/info-panel.component'

@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrl: './graph-view.component.css',
  imports: [InfoPanelComponent],
})
export class GraphViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('graphContainer') graphContainerRef!: ElementRef<HTMLDivElement>

  readonly graphData = input.required<GraphData>()

  // currentItem is a local signal that bridges the yFiles imperative event
  // to Angular's reactive system — the equivalent of React's useState in
  // the useCurrentItem hook from the React tutorial.
  currentItem = signal<IModelItem | null>(null)

  private graphComponent!: GraphComponent
  private builder!: GraphBuilder
  private nodesSource!: NodesSource<NodeData>
  private edgesSource!: EdgesSource<EdgeData>

  // Store the listener reference so we can remove it in ngOnDestroy.
  private readonly onCurrentItemChanged = (): void => {
    this.currentItem.set(this.graphComponent.currentItem)
  }

  constructor(
    private graphComponentService: GraphComponentService,
    private injector: Injector,
  ) {}

  ngAfterViewInit(): void {
    this.graphComponent = this.graphComponentService.getGraphComponent()

    const div = this.graphComponent.htmlElement
    div.style.width = '100%'
    div.style.height = '100%'
    this.graphContainerRef.nativeElement.appendChild(div)

    this.graphComponent.graph.nodeDefaults.size = new Size(140, 40)

    // Bridge the yFiles 'current-item-changed' event to the currentItem signal.
    // Angular will automatically re-render InfoPanelComponent whenever
    // this signal changes — no manual change detection needed.
    this.graphComponent.addEventListener('current-item-changed', this.onCurrentItemChanged)

    this.initBuilder()

    effect(
      () => {
        this.syncGraph(this.graphData())
      },
      { injector: this.injector },
    )
  }

  ngOnDestroy(): void {
    this.graphComponent?.removeEventListener('current-item-changed', this.onCurrentItemChanged)
  }

  private initBuilder(): void {
    this.builder = new GraphBuilder(this.graphComponent.graph)

    this.nodesSource = this.builder.createNodesSource<NodeData>([], (item) => item.id)
    this.nodesSource.nodeCreator.createLabelBinding((item) => item.name)

    // styleProvider — called by GraphBuilder for each node on create/update.
    // Returns a new style instance per node (required by yFiles).
    this.nodesSource.nodeCreator.styleProvider = (item) => getNodeStyle(item.type)

    // tagProvider — stores the source data item on node.tag.
    // This is the default behaviour, but being explicit makes it clear
    // that item.tag is how we retrieve the original data later (e.g. in
    // InfoPanelComponent).
    this.nodesSource.nodeCreator.tagProvider = (item) => item

    this.edgesSource = this.builder.createEdgesSource<EdgeData>(
      [],
      (item) => item.fromNode,
      (item) => item.toNode,
    )
  }

  private syncGraph(data: GraphData): void {
    this.builder.setData(this.nodesSource, data.nodesSource)
    this.builder.setData(this.edgesSource, data.edgesSource)
    this.builder.updateGraph()
    void applyLayout(this.graphComponent)
  }
}

async function applyLayout(graphComponent: GraphComponent): Promise<void> {
  await new LayoutExecutor({
    graphComponent,
    layout: new HierarchicalLayout(),
    animationDuration: '0.5s',
    animateViewport: true,
  }).start()
}
