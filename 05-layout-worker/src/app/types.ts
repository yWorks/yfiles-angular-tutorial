export type NodeType = 'client' | 'gateway' | 'service' | 'database'

export interface NodeData {
  id: number
  name: string
  type: NodeType
}

export interface EdgeData {
  fromNode: number
  toNode: number
}

export interface GraphData {
  nodesSource: NodeData[]
  edgesSource: EdgeData[]
}
