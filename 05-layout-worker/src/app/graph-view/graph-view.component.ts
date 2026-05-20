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
  IModelItem,
  LayoutExecutorAsync,
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
  currentItem = signal<IModelItem | null>(null)

  private graphComponent!: GraphComponent
  private builder!: GraphBuilder
  private nodesSource!: NodesSource<NodeData>
  private edgesSource!: EdgesSource<EdgeData>

  // The Worker and LayoutExecutorAsync are created once and reused for every
  // layout call. Creating a new Worker per layout would be very expensive.
  //
  // Note: we intentionally do NOT terminate the worker in ngOnDestroy.
  // In development the Angular build tools may recreate modules, and
  // terminating the worker while the executor still holds a reference to
  // it causes errors. For a production app you would tie the worker lifetime
  // to the application lifetime (e.g. in a singleton service).
  private worker!: Worker
  private executor!: LayoutExecutorAsync

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

    this.graphComponent.addEventListener('current-item-changed', this.onCurrentItemChanged)

    this.initBuilder()
    this.initLayoutWorker()

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
    this.nodesSource.nodeCreator.styleProvider = (item) => getNodeStyle(item.type)
    this.nodesSource.nodeCreator.tagProvider = (item) => item

    this.edgesSource = this.builder.createEdgesSource<EdgeData>(
      [],
      (item) => item.fromNode,
      (item) => item.toNode,
    )
  }

  private initLayoutWorker(): void {
    // new URL(..., import.meta.url) is the standard way to reference a
    // worker file so bundlers (webpack, Vite) know to emit it as a separate
    // chunk. { type: 'module' } enables ES module syntax inside the worker.
    this.worker = new Worker(new URL('../layout.worker.ts', import.meta.url), { type: 'module' })

    // LayoutExecutorAsync runs on the main thread: it serialises the graph,
    // sends it to the worker, waits for the result, then animates the
    // transition — keeping the UI thread free during the heavy computation.
    this.executor = new LayoutExecutorAsync({
      messageHandler: LayoutExecutorAsync.createWebWorkerMessageHandler(this.worker),
      graphComponent: this.graphComponent,
      animationDuration: '0.5s',
      animateViewport: true,
    })
  }

  private syncGraph(data: GraphData): void {
    this.builder.setData(this.nodesSource, data.nodesSource)
    this.builder.setData(this.edgesSource, data.edgesSource)
    this.builder.updateGraph()

    // executor.start() is the only change from the previous chapter:
    // the layout algorithm now runs in the worker thread instead of
    // blocking the main thread.
    void this.executor.start()
  }
}
