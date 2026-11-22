export type NodeKind =
  | "client"
  | "loadbalancer"
  | "gateway"
  | "service"
  | "database"
  | "cache"
  | "queue"
  | "storage"
  | "cdn"
  | "worker";

export interface CanvasNodeLike {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel?: string;
  /** Viewport position — persisted for restore, ignored by the LLM serializer. */
  x?: number;
  y?: number;
}

export interface CanvasEdgeLike {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CanvasGraph {
  nodes: CanvasNodeLike[];
  edges: CanvasEdgeLike[];
}

export const NODE_KIND_META: Record<
  NodeKind,
  { label: string; defaultSublabel: string; hint: string }
> = {
  client: { label: "Client", defaultSublabel: "Web / Mobile / TV", hint: "Client" },
  loadbalancer: {
    label: "Load Balancer",
    defaultSublabel: "L7 · ALB",
    hint: "Load Balancer",
  },
  gateway: {
    label: "API Gateway",
    defaultSublabel: "Auth · Rate limit",
    hint: "API Gateway",
  },
  service: {
    label: "Microservice",
    defaultSublabel: "Stateless",
    hint: "Microservice",
  },
  database: {
    label: "Database",
    defaultSublabel: "PostgreSQL",
    hint: "Database (SQL / NoSQL)",
  },
  cache: { label: "Cache", defaultSublabel: "Redis", hint: "Cache (Redis)" },
  queue: {
    label: "Message Queue",
    defaultSublabel: "Kafka",
    hint: "Message Queue (Kafka / SQS)",
  },
  storage: {
    label: "Object Storage",
    defaultSublabel: "S3",
    hint: "Object Storage (S3)",
  },
  cdn: {
    label: "CDN",
    defaultSublabel: "Edge / Open Connect",
    hint: "CDN (Edge / Open Connect)",
  },
  worker: {
    label: "Worker",
    defaultSublabel: "Transcoder",
    hint: "Worker / Transcoder",
  },
};

export function emptyGraph(): CanvasGraph {
  return { nodes: [], edges: [] };
}
