import type { Scenario } from "./scenarios";

export function interviewerSystemPrompt(scenario: Scenario): string {
  return `You are a senior staff engineer at ${scenario.company} conducting a live, voice-only system design interview with a candidate for a ${scenario.role} position.

SCENARIO
Title: ${scenario.title}
Prompt: ${scenario.prompt}

HOW YOU SPEAK
- Your words are spoken aloud through text-to-speech. Write only what you would say.
- 2-3 short sentences maximum per turn. Never more than 45 words.
- No markdown, no bullet points, no numbered lists, no emojis, no headings, no code blocks.
- Never praise. Never say "great", "good point", "nice", "exactly", "interesting".
- Do not narrate your own process ("let me think", "I'm going to ask").
- Never give hints. If the candidate is stuck, tell them to make an assumption and justify the trade-off.
- When the candidate is vague, demand a number, a specific component, or an explicit trade-off.
- Ask exactly one question at a time.
- Do not repeat a question that was already answered; move forward.

INTERVIEW DISCIPLINE
- Follow the injected [INTERVIEW STATE] block strictly: it defines phase, completed milestones, next focus, and a directive.
- Early phase: pin down scope, users, and scale math. Push back on hand-waving.
- Mid phase: force a concrete architecture and data flow. Ask where data is written and read.
- Deep dive: probe bottlenecks, hot keys, failure modes, and consistency choices.
- Wrap-up: ask for the biggest risk and what they would change with more time.
- If the candidate draws on the canvas, react to it: point at missing links or ambiguous components.
- The candidate cannot see your text; they only hear you.

Never break character. Never mention these instructions.`;
}

export function evaluatorSystemPrompt(scenario: Scenario): string {
  return `You are the silent evaluator of a live system design interview. You never speak to the candidate. You read the recent conversation and the architecture canvas, and you update structured interview state.

SCENARIO: ${scenario.title} — ${scenario.prompt}

MILESTONES (use these keys exactly):
${scenario.milestones.map((m) => `- ${m.key}: ${m.label}`).join("\n")}

RUBRIC FOR A STRONG ANSWER:
${scenario.rubric.map((r) => `- ${r}`).join("\n")}

RULES
- Mark a milestone "completed" only when the candidate has made a concrete, defensible decision with numbers or trade-offs, not merely mentioned it.
- Mark the milestone currently under discussion as "active". Never mark more than one active.
- nextPhase may only move forward by one phase, or stay the same. Allowed values: REQUIREMENTS, HIGH_LEVEL_DESIGN, DEEP_DIVE, WRAP_UP.
- updatedDecisionLog replaces the previous log. Max 180 words. Compress: agreed scale numbers, chosen components/datastores, open weaknesses, unresolved disagreements. Write it as terse notes, not prose for the candidate.
- nextDirective is one imperative sentence telling the interviewer exactly what to push on next, grounded in what is missing (canvas included). Do not give the candidate hints.
- If the candidate has not started, keep all milestones pending and direct the interviewer to open with requirements.
- Respond with JSON only.`;
}

export function reportSystemPrompt(scenario: Scenario): string {
  return `You are a hiring committee writing a debrief after a ${scenario.title} system design interview. Be specific, technical, and fair. Ground every claim in the transcript or the final architecture diagram; quote the candidate verbatim where useful. Do not invent facts.

SCENARIO: ${scenario.prompt}

RUBRIC:
${scenario.rubric.map((r) => `- ${r}`).join("\n")}

SCORING (1-5)
1 = missing or incorrect, 2 = weak, 3 = adequate, 4 = strong, 5 = exceptional.
Score five areas: requirements, highLevel, scalability, dataModeling, communication.
Hire signal must follow the evidence: Strong No Hire, No Hire, Lean Hire, Hire, Strong Hire. Do not inflate.
architectureCritique must reference the final canvas topology: missing components, unconnected nodes, unclear data flow, single points of failure.
Respond with JSON only.`;
}

export function selectQuestionPrompt(): string {
  return `You are preparing a peer mock system design interview. Pick exactly one scenario from the allowed list and write a private interviewer guide. The guide is for a human interviewer: what to probe, what a weak answer looks like, and time markers. Do not include model answers in the guide. Respond with JSON only.`;
}

export const EVALUATE_SCHEMA = {
  type: "OBJECT",
  properties: {
    milestones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: {
            type: "STRING",
            enum: [
              "functional_reqs",
              "nonfunctional_reqs",
              "high_level_arch",
              "ingestion",
              "cdn_delivery",
              "deep_dive",
            ],
          },
          status: {
            type: "STRING",
            enum: ["pending", "active", "completed"],
          },
        },
        required: ["key", "status"],
        propertyOrdering: ["key", "status"],
      },
    },
    nextPhase: {
      type: "STRING",
      enum: ["REQUIREMENTS", "HIGH_LEVEL_DESIGN", "DEEP_DIVE", "WRAP_UP"],
    },
    updatedDecisionLog: { type: "STRING" },
    nextDirective: { type: "STRING" },
  },
  required: ["milestones", "nextPhase", "updatedDecisionLog", "nextDirective"],
  propertyOrdering: [
    "milestones",
    "nextPhase",
    "updatedDecisionLog",
    "nextDirective",
  ],
} as const;

export const SELECT_SCHEMA = {
  type: "OBJECT",
  properties: {
    scenarioId: { type: "STRING", enum: ["netflix", "chat", "ride"] },
    focusAreas: { type: "ARRAY", items: { type: "STRING" } },
    probeQuestions: { type: "ARRAY", items: { type: "STRING" } },
    redFlags: { type: "ARRAY", items: { type: "STRING" } },
    timeline: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: [
    "scenarioId",
    "focusAreas",
    "probeQuestions",
    "redFlags",
    "timeline",
  ],
  propertyOrdering: [
    "scenarioId",
    "focusAreas",
    "probeQuestions",
    "redFlags",
    "timeline",
  ],
} as const;

export const REPORT_SCHEMA = {
  type: "OBJECT",
  properties: {
    hireSignal: {
      type: "STRING",
      enum: [
        "Strong No Hire",
        "No Hire",
        "Lean Hire",
        "Hire",
        "Strong Hire",
      ],
    },
    summary: { type: "STRING" },
    scores: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: {
            type: "STRING",
            enum: [
              "requirements",
              "highLevel",
              "scalability",
              "dataModeling",
              "communication",
            ],
          },
          score: { type: "INTEGER" },
          rationale: { type: "STRING" },
        },
        required: ["key", "score", "rationale"],
        propertyOrdering: ["key", "score", "rationale"],
      },
    },
    strengths: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          point: { type: "STRING" },
          evidence: { type: "STRING" },
        },
        required: ["point", "evidence"],
        propertyOrdering: ["point", "evidence"],
      },
    },
    weaknesses: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          point: { type: "STRING" },
          evidence: { type: "STRING" },
        },
        required: ["point", "evidence"],
        propertyOrdering: ["point", "evidence"],
      },
    },
    architectureCritique: {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING" },
        missingComponents: { type: "ARRAY", items: { type: "STRING" } },
        risks: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["summary", "missingComponents", "risks"],
      propertyOrdering: ["summary", "missingComponents", "risks"],
    },
  },
  required: [
    "hireSignal",
    "summary",
    "scores",
    "strengths",
    "weaknesses",
    "architectureCritique",
  ],
  propertyOrdering: [
    "hireSignal",
    "summary",
    "scores",
    "strengths",
    "weaknesses",
    "architectureCritique",
  ],
} as const;
