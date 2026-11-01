export type CommunityLeaderboardEntry = {
  name: string;
  streak: number;
  progress: number;
  accent: string;
};

export type CommunityChallenge = {
  title: string;
  progress: number;
  target: number;
  reward: string;
  description: string;
};

export type CommunityDiscussion = {
  title: string;
  author: string;
  replies: number;
  tag: string;
  excerpt: string;
};

export type CommunitySnapshot = {
  leaderboard: CommunityLeaderboardEntry[];
  challenge: CommunityChallenge;
  discussions: CommunityDiscussion[];
};

export function getCommunitySnapshot({
  completedCount,
  percentage,
  streak,
}: {
  completedCount: number;
  percentage: number;
  streak: number;
}): CommunitySnapshot {
  const leaderboard: CommunityLeaderboardEntry[] = [
    { name: "You", streak, progress: percentage, accent: "you" },
    { name: "Maya", streak: Math.max(streak + 2, 7), progress: Math.min(100, percentage + 8), accent: "mentor" },
    { name: "Daniel", streak: Math.max(streak + 1, 5), progress: Math.min(100, percentage + 4), accent: "peer" },
  ];

  const progressTarget = Math.max(1, Math.min(100, Math.round(Math.max(percentage, 20))));
  const challenge: CommunityChallenge = {
    title: "Cohort learning sprint",
    progress: Math.min(100, Math.max(0, completedCount * 10)),
    target: 100,
    reward: "Badge + peer shout-out",
    description: "Complete a focused set of lessons before the week closes and keep the whole cohort moving.",
  };

  if (streak <= 2 || percentage < 35) {
    challenge.title = "Streak recovery sprint";
    challenge.progress = Math.min(100, Math.max(25, progressTarget));
    challenge.reward = "Quick win badge";
    challenge.description = "A short, focused 20-minute session is enough to rebuild momentum. Pick one lesson, finish it, and come back for another quick win tomorrow.";
  } else if (progressTarget >= 80) {
    challenge.title = "Momentum challenge";
    challenge.reward = "Featured in next community round-up";
  }

  return {
    leaderboard,
    challenge,
    discussions: [
      {
        title: "Best way to practice async patterns?",
        author: "Aisha",
        replies: 19,
        tag: "Help",
        excerpt: "I keep mixing up promises and timers. What approach helps you get more comfortable with async flows?",
      },
      {
        title: "Weekly project check-in",
        author: "Noah",
        replies: 7,
        tag: "Challenge",
        excerpt: "Share your mini-project ideas and what you used from the course to build them.",
      },
      {
        title: "Streak recovery tips",
        author: "Priya",
        replies: 13,
        tag: "Tips",
        excerpt: "How do you fit 20 minutes of focused learning into a busy week without breaking momentum?",
      },
    ],
  };
}
