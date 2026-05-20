import { Component } from '@angular/core'
import { GraphViewComponent } from './graph-view/graph-view.component'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [GraphViewComponent],
})
export class AppComponent {}
