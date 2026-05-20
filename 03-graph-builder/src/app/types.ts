export interface NodeData {
  id: number
  name: string
}

export interface EdgeData {
  fromNode: number
  toNode: number
}

export interface GraphData {
  nodesSource: NodeData[]
  edgesSource: EdgeData[]
}
