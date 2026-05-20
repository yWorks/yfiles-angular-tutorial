import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core'
import { GraphComponentService } from '../graph-component.service'

/**
 * GraphViewComponent is responsible for mounting the yFiles GraphComponent
 * into the Angular template.
 *
 * The yFiles GraphComponent manages its own <div> element (graphComponent.htmlElement).
 * Our job is simply to append that element into a container div in our template
 * once the view is ready.
 *
 * Why ngAfterViewInit and not ngOnInit?
 * The @ViewChild reference to #graphContainer is only available after Angular
 * has rendered the template — that is, after ngAfterViewInit. Using ngOnInit
 * would give us a null reference.
 */
@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrl: './graph-view.component.css',
})
export class GraphViewComponent implements AfterViewInit {
  @ViewChild('graphContainer') graphContainerRef!: ElementRef<HTMLDivElement>

  constructor(private graphComponentService: GraphComponentService) {}

  ngAfterViewInit(): void {
    const graphComponent = this.graphComponentService.getGraphComponent()

    // The yFiles GraphComponent owns a plain HTMLDivElement.
    // We size it to fill its container and append it to our template div.
    const div = graphComponent.htmlElement
    div.style.width = '100%'
    div.style.height = '100%'
    this.graphContainerRef.nativeElement.appendChild(div)
  }
}
