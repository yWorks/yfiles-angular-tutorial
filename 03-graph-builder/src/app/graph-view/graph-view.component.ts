import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  ViewChild,
  effect,
  input,
} from '@angular/core'
import {
  EdgesSource,
  GraphBuilder,
  GraphComponent,
  HierarchicalLayout,
  LayoutExecutor,
  NodesSource,
  Size,
} from '@yfiles/yfiles'
import { GraphComponentService } from '../graph-component.service'
import { GraphData, NodeData, EdgeData } from '../types'

/**
 * GraphViewComponent now does two things:
 *   1. Mount the yFiles canvas (same as before)
 *   2. Keep the graph in sync with its graphData input
 *
 * The graphData input is an Angular signal input (input.required<T>()).
 * This is the Angular equivalent of a React prop: the parent passes data
 * down, and the child reacts to changes.
 *
 * We use effect() — Angular's equivalent of React's useEffect — to call
 * syncGraph() whenever the graphData signal changes. Crucially, we create
 * the effect inside ngAfterViewInit (not the constructor) so that the
 * GraphBuilder is already initialized when the effect first fires.
 */
@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrl: './graph-view.component.css',
})
export class GraphViewComponent implements AfterViewInit {
  @ViewChild('graphContainer') graphContainerRef!: ElementRef<HTMLDivElement>

  // Signal input — the parent binds data here with [graphData]="..."
  readonly graphData = input.required<GraphData>()

  private graphComponent!: GraphComponent
  private builder!: GraphBuilder
  private nodesSource!: NodesSource<NodeData>
  private edgesSource!: EdgesSource<EdgeData>

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

    this.initBuilder()

    // Create the effect AFTER the builder is initialized.
    // The effect runs once immediately with the current graphData value,
    // then re-runs automatically whenever graphData changes.
    //
    // We pass { injector } because we are outside the constructor's
    // injection context — this is required when creating effects in
    // lifecycle hooks.
    //
    // React equivalent:
    //   useEffect(() => { syncGraph(graphData) }, [graphData])
    effect(
      () => {
        this.syncGraph(this.graphData())
      },
      { injector: this.injector },
    )
  }

  private initBuilder(): void {
    this.builder = new GraphBuilder(this.graphComponent.graph)

    // createNodesSource binds an array of data items to graph nodes.
    // The second argument is the id provider — a stable key used by
    // GraphBuilder to match data items to existing nodes on update,
    // enabling incremental updates instead of full rebuilds.
    this.nodesSource = this.builder.createNodesSource<NodeData>([], (item) => item.id)
    this.nodesSource.nodeCreator.createLabelBinding((item) => item.name)

    // createEdgesSource binds an array of data items to graph edges.
    // The second and third arguments resolve the source and target node
    // by returning the id of the corresponding data item.
    this.edgesSource = this.builder.createEdgesSource<EdgeData>(
      [],
      (item) => item.fromNode,
      (item) => item.toNode,
    )
  }

  private syncGraph(data: GraphData): void {
    // setData replaces the data array on the source without rebuilding
    // from scratch. updateGraph() then reconciles: it creates nodes/edges
    // for new items, updates changed ones, and removes deleted ones.
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
