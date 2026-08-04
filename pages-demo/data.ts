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
    course: "Forge Ridge Disc Golf Club",
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
  { id: "confident-first-round", level: "Beginner", title: "Confident first round", progress: 72, next: "Wind basics · 8 min", summary: "Learn a simple wind read, choose a familiar disc, and aim for the widest safe landing zone.", drill: "Throw five flat releases at 60% power in calm air, then repeat while noting the wind direction." },
  { id: "shape-the-fairway", level: "Intermediate", title: "Shape the fairway", progress: 34, next: "Turnovers versus flex shots · 12 min", summary: "Compare a turnover and flex line by their landing shape, miss pattern, and required stability.", drill: "Mark one landing zone and throw three controlled turnovers followed by three flex lines." },
  { id: "putting-reset", level: "Practice", title: "Putting reset", progress: 50, next: "20-putt ladder · 15 min", summary: "Build a repeatable pre-putt cue while keeping the session short enough to preserve quality.", drill: "Make five putts at 10, 15, 20, and 25 feet. Reset your stance before every attempt." },
];
