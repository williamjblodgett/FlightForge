export const CADDIE_KNOWLEDGE_VERSION = "flightforge-field-guide-1.0";

export type CaddieKnowledgeSource = {
  title: string;
  url: string;
  authority: "RULES" | "MANUFACTURER" | "PEER_REVIEWED" | "RESEARCH";
  scope: string;
};

export const caddieKnowledgeSources: CaddieKnowledgeSource[] = [
  {
    title: "PDGA Official Rules and simplified rules",
    url: "https://www.pdga.com/rules/simplified-rules-disc-golf",
    authority: "RULES",
    scope: "Rules, safety, lie, stance, out-of-bounds, and scoring context",
  },
  {
    title: "Innova flight numbers explained",
    url: "https://www.innovadiscs.com/disc-golf-discs/flight-numbers-made-simple/",
    authority: "MANUFACTURER",
    scope: "Speed, glide, turn, and fade terminology; ratings are comparative rather than measured guarantees",
  },
  {
    title: "Aerodynamic performance of flying discs",
    url: "https://research-portal.uws.ac.uk/en/publications/aerodynamic-performance-of-flying-discs/",
    authority: "PEER_REVIEWED",
    scope: "Lift, drag, pitching moment, and flight behavior",
  },
  {
    title: "Trajectory optimization of disc-golf drives",
    url: "https://link.springer.com/article/10.1007/s12283-022-00390-5",
    authority: "PEER_REVIEWED",
    scope: "Launch conditions, trajectory, and the limits of generalized flight models",
  },
  {
    title: "Biomechanical analysis of disc-golf throws",
    url: "https://repository.lboro.ac.uk/articles/conference_contribution/Biomechanical_analysis_of_disc_golf_throws_to_improve_performance/27045130",
    authority: "RESEARCH",
    scope: "Throw sequencing and biomechanical measurement research",
  },
  {
    title: "Disc-golf injuries and injury prevention",
    url: "https://pubmed.ncbi.nlm.nih.gov/26665099/",
    authority: "PEER_REVIEWED",
    scope: "Injury patterns; the caddie does not diagnose or provide medical treatment",
  },
];

export const caddieSafetyRules = [
  "Never recommend a throw unless the fairway and landing area are clear of people and animals.",
  "Treat GPS, wind, distance, and flight estimates as approximate.",
  "Prefer an owned disc and explain when a recommendation relies only on catalog ratings.",
  "Separate official rules from strategy and say when a tournament director or course rule controls.",
  "Do not diagnose pain or injuries; advise the player to stop if a motion causes pain and seek a qualified professional.",
  "State uncertainty and missing inputs instead of inventing hole, weather, player, or disc facts.",
] as const;

export function buildCaddieSystemInstructions(bagSummary: string): string {
  return [
    "You are the FlightForge field caddie, a concise disc-golf assistant used during play.",
    "Use only the supplied player and bag context. Never invent a disc in the player's bag, hole geometry, weather, distance, or score.",
    "When giving shot advice, answer in this order: recommendation, why, one execution cue, main risk, safer option, confidence, missing information.",
    "Flight numbers are comparative manufacturer ratings, not guaranteed measurements. Wear, plastic, weight, elevation, temperature, wind, release, and player power can change flight.",
    "For rules questions, explain that event-specific and course rules may control and the tournament director is authoritative during sanctioned competition.",
    ...caddieSafetyRules,
    `Private active-bag context: ${bagSummary || "No active discs are recorded."}`,
    `Knowledge version: ${CADDIE_KNOWLEDGE_VERSION}.`,
  ].join("\n");
}

export function fallbackCaddieAnswer(message: string, bagSummary: string): { answer: string; confidence: "LOW" | "MEDIUM"; topics: string[] } {
  const normalized = message.toLowerCase();
  if (/pain|hurt|injur|sore|medical/u.test(normalized)) {
    return {
      answer: "Stop any throw that causes pain. I can discuss lower-effort practice and general warm-up ideas, but I cannot diagnose an injury or give medical treatment. A qualified clinician or coach who can assess you in person is the right next step.",
      confidence: "MEDIUM",
      topics: ["safety", "health boundary"],
    };
  }
  if (/headwind|tailwind|crosswind|wind/u.test(normalized)) {
    return {
      answer: `In a headwind, relative airspeed increases, so favor a familiar disc with more turn resistance and dependable fade. In a tailwind, a slower or less stable disc may carry more naturally. In a crosswind, avoid exposing the underside of the flight plate and choose the safest landing zone. ${bagSummary ? `Your active bag is: ${bagSummary}.` : "Add discs to your bag for a specific owned-disc choice."} Wind and gusts can change quickly, so treat this as a starting point.`,
      confidence: "MEDIUM",
      topics: ["wind", "disc selection"],
    };
  }
  if (/flight number|speed|glide|turn|fade|stable/u.test(normalized)) {
    return {
      answer: "Flight numbers describe speed, glide, high-speed turn, and low-speed fade. They are useful comparative labels, not exact measurements. Plastic, weight, wear, altitude, temperature, wind, release, and your power all affect the real flight, which is why FlightForge learns from representative throws with each physical disc.",
      confidence: "MEDIUM",
      topics: ["flight numbers", "disc flight"],
    };
  }
  if (/form|backhand|forehand|nose angle|release|throw/u.test(normalized)) {
    return {
      answer: "Start with one repeatable cue: use a balanced athletic stance, keep the motion smooth, release on the intended angle, and finish under control. Do not chase maximum power when the landing area is tight. Video can reveal observable timing or balance patterns, but one camera view cannot measure exact spin, velocity, or joint loading.",
      confidence: "LOW",
      topics: ["technique", "camera limits"],
    };
  }
  return {
    answer: `Tell me the hole distance, intended finish, wind, elevation, hazards, and whether you prefer a safe or aggressive line. ${bagSummary ? `I can work from these active discs: ${bagSummary}.` : "Add your discs to the digital bag so I can recommend equipment you actually carry."} Always confirm the fairway and landing area are clear before throwing.`,
    confidence: "LOW",
    topics: ["missing context"],
  };
}
