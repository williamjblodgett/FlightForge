export const tournaments = [
  {
    id: "event-pine-state-open",
    name: "Pine State Open",
    date: "August 22–23",
    course: "Forge Ridge Disc Golf Club",
    format: "Two-round stroke play",
    divisions: ["Beginner", "Recreational", "Advanced"],
    capacity: 72,
    registered: 58,
    feeCents: 3500,
  },
  {
    id: "event-summer-scramble",
    name: "Summer Doubles Scramble",
    date: "September 6",
    course: "Pineland Farms Disc Golf",
    format: "Best-shot doubles",
    divisions: ["Mixed", "Open"],
    capacity: 48,
    registered: 39,
    feeCents: 2400,
  },
] as const;

export const leagueStandings = [
  { rank: 1, player: "Maya Chen", events: 7, points: 184 },
  { rank: 2, player: "Theo Brooks", events: 7, points: 176 },
  { rank: 3, player: "Jordan Ellis", events: 6, points: 159 },
  { rank: 4, player: "Recreational Player", events: 6, points: 143 },
  { rank: 5, player: "Sam Rivera", events: 5, points: 126 },
];

export const learningTracks = [
  { level: "Beginner", title: "Confident first round", progress: 72, next: "Wind basics · 8 min" },
  { level: "Intermediate", title: "Shape the fairway", progress: 34, next: "Turnovers versus flex shots · 12 min" },
  { level: "Practice", title: "Putting reset", progress: 50, next: "20-putt ladder · 15 min" },
];
