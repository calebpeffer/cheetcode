import { DIFFICULTY_BONUS, type Difficulty } from "../../server/problems";

export type SubmissionScoreInput = {
  solved: boolean;
  difficulty: Difficulty;
};

export function getDifficultyBonus(submissions: SubmissionScoreInput[]): number {
  return submissions.reduce((sum, submission) => {
    if (!submission.solved) {
      return sum;
    }
    return sum + DIFFICULTY_BONUS[submission.difficulty];
  }, 0);
}

export function computeElo(params: {
  solvedCount: number;
  timeRemainingSecs: number;
  difficultyBonus: number;
}): number {
  const { solvedCount, timeRemainingSecs, difficultyBonus } = params;
  return solvedCount * 100 + timeRemainingSecs * 20 + difficultyBonus;
}
