export interface PageNode {
  id: string
  name: string
  url: string
  doc: string
  docHtml: string
  apis: PageApi[]
  x: number
  y: number
  width: number
  height: number
  jumps: PageJump[]
}

export interface PageApi {
  id: string
  name: string
  path: string
  docUrl: string
}

export interface PageJump {
  id: string
  to: string
  targetId: string
  reason: string
}

export interface Edge {
  id: string
  sourceId: string
  targetId: string
  jumpId: string
  reason: string
}

export interface DrawnLine {
  path: string
  key: string
  color: string
}

export interface RoutePoint {
  x: number
  y: number
}

export interface RoutePort extends RoutePoint {
  dx: number
  dy: number
}

export interface JumpMarker {
  key: string
  edge: Edge
  x: number
  y: number
  sourceName: string
  targetName: string
}
