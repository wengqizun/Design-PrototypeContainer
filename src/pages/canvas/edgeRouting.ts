import type { PageNode, RoutePoint, RoutePort } from './types'

export const JUMP_REASON_MARKER_RADIUS = 12
export const JUMP_ENTRY_MARKER_RADIUS = 14
export const MARKER_LINE_GAP = 3

const ROUTE_STUB_LENGTH = 36
const ROUTE_LANE_GAP = 28
const ROUTE_OUTER_GAP = 76

const EDGE_COLORS = [
  '#2563eb',
  '#0f766e',
  '#c2410c',
  '#7c3aed',
  '#be123c',
  '#15803d',
  '#0369a1',
  '#a16207',
]

export const getMarkerOffset = (index: number, total: number) => {
  const spacing = 30
  return (index - (total - 1) / 2) * spacing
}

const simplifyRoutePoints = (pts: RoutePoint[]) => {
  const simplified: RoutePoint[] = []

  for (const point of pts) {
    const prev = simplified[simplified.length - 1]
    if (prev && prev.x === point.x && prev.y === point.y) continue

    simplified.push(point)

    while (simplified.length >= 3) {
      const a = simplified[simplified.length - 3]
      const b = simplified[simplified.length - 2]
      const c = simplified[simplified.length - 1]
      const isCollinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
      if (!isCollinear) break
      simplified.splice(simplified.length - 2, 1)
    }
  }

  return simplified
}

const drawRoundedPath = (pts: RoutePoint[], radius: number) => {
  const points = simplifyRoutePoints(pts)
  if (points.length < 2) return ''

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]

    if (i === points.length - 1) {
      d += ` L ${curr.x} ${curr.y}`
      continue
    }

    const next = points[i + 1]
    const prevDirection = { x: Math.sign(curr.x - prev.x), y: Math.sign(curr.y - prev.y) }
    const nextDirection = { x: Math.sign(next.x - curr.x), y: Math.sign(next.y - curr.y) }
    const prevDistance = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y)
    const nextDistance = Math.abs(next.x - curr.x) + Math.abs(next.y - curr.y)
    const r = Math.min(radius, prevDistance / 2, nextDistance / 2)
    const arcStart = { x: curr.x - prevDirection.x * r, y: curr.y - prevDirection.y * r }
    const arcEnd = { x: curr.x + nextDirection.x * r, y: curr.y + nextDirection.y * r }

    d += ` L ${arcStart.x} ${arcStart.y} Q ${curr.x} ${curr.y} ${arcEnd.x} ${arcEnd.y}`
  }

  return d
}

export const getLaneOffset = (index: number, total: number) => {
  return (index - (total - 1) / 2) * ROUTE_LANE_GAP
}

export const getEdgeColor = (edgeId: string, index: number) => {
  let hash = 0
  for (const char of edgeId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return EDGE_COLORS[(hash + index) % EDGE_COLORS.length]
}

export const routeEdge = (
  source: PageNode,
  target: PageNode,
  sourcePort: RoutePort,
  targetPort: RoutePort,
  laneOffset: number,
  index: number,
) => {
  const startLead = {
    x: sourcePort.x + sourcePort.dx * ROUTE_STUB_LENGTH,
    y: sourcePort.y + sourcePort.dy * ROUTE_STUB_LENGTH,
  }
  const endLead = {
    x: targetPort.x + targetPort.dx * ROUTE_STUB_LENGTH,
    y: targetPort.y + targetPort.dy * ROUTE_STUB_LENGTH,
  }

  if (startLead.x < endLead.x) {
    const midX = (startLead.x + endLead.x) / 2 + laneOffset
    return drawRoundedPath([sourcePort, startLead, { x: midX, y: startLead.y }, { x: midX, y: endLead.y }, endLead, targetPort], 14)
  }

  const topY = Math.min(source.y, target.y) - ROUTE_OUTER_GAP - Math.max(0, Math.abs(laneOffset))
  const bottomY = Math.max(source.y + source.height, target.y + target.height) + ROUTE_OUTER_GAP + Math.max(0, Math.abs(laneOffset))
  const useTopLane = index % 2 === 0
  const outerY = useTopLane ? topY : bottomY

  return drawRoundedPath([sourcePort, startLead, { x: startLead.x, y: outerY }, { x: endLead.x, y: outerY }, endLead, targetPort], 16)
}
