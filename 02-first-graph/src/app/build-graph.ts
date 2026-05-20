import { IGraph, Size } from '@yfiles/yfiles'

/**
 * Populates the given graph with a small service-dependency graph.
 *
 * This function is intentionally framework-agnostic: it takes an IGraph
 * and knows nothing about Angular. Keeping graph logic separate from
 * component logic makes it easy to test and reuse.
 *
 * graph.createNode({ labels: ['text'] }) creates a node and attaches a
 * label in one call. graph.createEdge(source, target) creates a directed
 * edge between two nodes.
 */
export function buildGraph(graph: IGraph): void {
  // Set the default size for all nodes created from this point on.
  // 140 × 40 is a comfortable size for single-line labels.
  graph.nodeDefaults.size = new Size(140, 40)

  // Create nodes
  const app = graph.createNode({ labels: ['App'] })
  const router = graph.createNode({ labels: ['Router'] })
  const store = graph.createNode({ labels: ['Store'] })
  const apiService = graph.createNode({ labels: ['API Service'] })
  const authService = graph.createNode({ labels: ['Auth Service'] })
  const database = graph.createNode({ labels: ['Database'] })

  // Create edges (directed: source → target)
  graph.createEdge(app, router)
  graph.createEdge(app, store)
  graph.createEdge(app, apiService)
  graph.createEdge(apiService, authService)
  graph.createEdge(apiService, database)
}
