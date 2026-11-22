export type MilestoneStatus = "pending" | "active" | "completed";

export type MilestoneKey =
  | "functional_reqs"
  | "nonfunctional_reqs"
  | "high_level_arch"
  | "ingestion"
  | "cdn_delivery"
  | "deep_dive";

export interface MilestoneDef {
  key: MilestoneKey;
  label: string;
  hint: string;
}

export interface Scenario {
  id: string;
  title: string;
  company: string;
  role: string;
  prompt: string;
  /** Default interview length in minutes. */
  durationMin: number;
  milestones: MilestoneDef[];
  /** What a strong answer must cover. Used by the evaluator and report. */
  rubric: string[];
}

export const NETFLIX: Scenario = {
  id: "netflix",
  title: "Design Netflix",
  company: "Google",
  role: "Senior Software Engineer · System Design",
  prompt:
    "Design a scalable global video streaming service supporting 300M users, adaptive bitrate streaming, and high-throughput video ingestion.",
  durationMin: 45,
  milestones: [
    {
      key: "functional_reqs",
      label: "Functional requirements",
      hint: "Core user journeys, out of scope, constraints",
    },
    {
      key: "nonfunctional_reqs",
      label: "Non-functional requirements & scale math",
      hint: "QPS, storage, bandwidth, availability, latency targets",
    },
    {
      key: "high_level_arch",
      label: "High-level architecture",
      hint: "Clients, edge, services, data stores, request paths",
    },
    {
      key: "ingestion",
      label: "Video ingestion & transcoding pipeline",
      hint: "Upload, chunking, encode ladder, manifest generation",
    },
    {
      key: "cdn_delivery",
      label: "CDN & global playback delivery",
      hint: "Edge caching, HLS/DASH, adaptive bitrate, routing",
    },
    {
      key: "deep_dive",
      label: "Deep dive (bottlenecks, sharding, failure modes)",
      hint: "Hot partitions, SPOFs, cache strategy, backpressure",
    },
  ],
  rubric: [
    "Clarifies scope: catalog browsing, playback, upload/ingest, personalization, recommendations",
    "States scale numbers: 300M users, concurrent streams, peak bandwidth, catalog size, transcode throughput",
    "Separates control plane (metadata, auth, discovery) from data plane (video bytes)",
    "Designs ingest: chunked/resumable upload, object storage landing zone, event-driven transcode workers",
    "Produces a bitrate ladder and per-title/per-device encoding; mentions manifest generation (HLS/DASH)",
    "Pushes playback to CDN edge with long TTLs, signed URLs/tokens, origin shielding, multi-CDN failover",
    "Explains adaptive bitrate client behavior and startup latency trade-off",
    "Addresses metadata storage (SQL for billing/accounts, wide-column for viewing history) and caching",
    "Discusses bottlenecks: hot titles, thundering herd on release, transcode backlog, origin egress",
    "Covers failure modes: CDN region outage, encoder failure, DB failover, degraded-mode playback",
  ],
};

export const SCENARIO_POOL: Scenario[] = [
  NETFLIX,
  {
    id: "chat",
    title: "Design a Realtime Chat System",
    company: "Google",
    role: "Senior Software Engineer · System Design",
    prompt:
      "Design a realtime chat system supporting 500M users, one-to-one and group messaging, presence, and delivery guarantees across mobile and web.",
    durationMin: 45,
    milestones: [
      { key: "functional_reqs", label: "Functional requirements", hint: "Messaging, groups, presence, sync" },
      { key: "nonfunctional_reqs", label: "Non-functional requirements & scale math", hint: "QPS, fan-out, storage, latency" },
      { key: "high_level_arch", label: "High-level architecture", hint: "Gateway, services, stores, fan-out path" },
      { key: "ingestion", label: "Message write path & fan-out", hint: "Ordering, inbox model, delivery receipts" },
      { key: "cdn_delivery", label: "Realtime delivery & offline sync", hint: "WebSockets, push, history sync" },
      { key: "deep_dive", label: "Deep dive (bottlenecks, sharding, failure modes)", hint: "Hot groups, idempotency, failover" },
    ],
    rubric: [
      "Clarifies 1:1 vs group, message ordering, delivery/read receipts, presence",
      "Estimates concurrent connections, message QPS, storage growth",
      "Chooses WebSocket gateways with sticky sessions and a presence service",
      "Explains per-conversation ordering and an inbox/fan-out model for groups",
      "Covers offline sync, push notifications, and history pagination",
      "Addresses sharding by conversation, hot-group fan-out, idempotent sends",
      "Discusses failure modes: gateway drain, queue backlog, store failover",
    ],
  },
  {
    id: "ride",
    title: "Design a Ride-Hailing Platform",
    company: "Google",
    role: "Senior Software Engineer · System Design",
    prompt:
      "Design a ride-hailing platform for 20M daily rides: realtime driver location tracking, matching, pricing, and trip lifecycle across global cities.",
    durationMin: 45,
    milestones: [
      { key: "functional_reqs", label: "Functional requirements", hint: "Request, match, track, pay, cancel" },
      { key: "nonfunctional_reqs", label: "Non-functional requirements & scale math", hint: "Location QPS, match latency, consistency" },
      { key: "high_level_arch", label: "High-level architecture", hint: "Geo services, matching, trip service, stores" },
      { key: "ingestion", label: "Location ingestion & geospatial index", hint: "Write path, geohash/s2, freshness" },
      { key: "cdn_delivery", label: "Matching & dispatch delivery", hint: "Candidate search, offers, expiry" },
      { key: "deep_dive", label: "Deep dive (bottlenecks, sharding, failure modes)", hint: "City sharding, surge, idempotency" },
    ],
    rubric: [
      "Clarifies matching semantics, ETA, pricing, cancellation, payments",
      "Estimates location update QPS and write amplification",
      "Designs geospatial indexing (geohash/S2) with cell-based candidate search",
      "Explains dispatch offers with timeouts and idempotent trip state machine",
      "Covers city-level sharding and cross-region concerns",
      "Addresses failure modes: driver app offline, duplicate offers, payment retries",
    ],
  },
];

export function getScenario(id: string): Scenario {
  return SCENARIO_POOL.find((s) => s.id === id) ?? NETFLIX;
}

export const DEFAULT_MILESTONES: Record<MilestoneKey, MilestoneStatus> = {
  functional_reqs: "pending",
  nonfunctional_reqs: "pending",
  high_level_arch: "pending",
  ingestion: "pending",
  cdn_delivery: "pending",
  deep_dive: "pending",
};
