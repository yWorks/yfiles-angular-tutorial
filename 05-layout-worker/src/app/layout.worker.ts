import { HierarchicalLayout, LayoutExecutorAsyncWorker, LayoutGraph, License } from '@yfiles/yfiles'
import licenseData from '../license.json'

// Web workers run in an isolated global context — they do NOT share the
// License.value assignment from main.ts, so we must set it here too.
License.value = licenseData

// initializeWebWorker registers a message listener that:
//   1. Receives a serialised graph from the main thread
//   2. Deserialises it into a LayoutGraph
//   3. Calls our handler to run the algorithm
//   4. Serialises the result and posts it back
//
// Our handler calls applyLayout() — the synchronous, worker-safe API.
// The handler can also return a Promise for async algorithms.
LayoutExecutorAsyncWorker.initializeWebWorker((graph: LayoutGraph) => {
  new HierarchicalLayout().applyLayout(graph)
})
