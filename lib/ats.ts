/**
 * Resume scoring across several models at once: every model gets the same
 * brief and must answer with one JSON verdict, so the scores are comparable
 * and disagreement between them is the signal worth reading.
 */

export interface AtsVerdict {
  /** 0 to 100. */
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
}

export function buildAtsPrompt(
  resume: string,
  jobDescription?: string,
): string {
  const target = jobDescription?.trim();
  return `You are an experienced technical recruiter screening a resume the way an applicant tracking system plus a hiring manager would.

${target ? `Job description to score against:\n${target}\n` : "No job description was supplied. Score the resume on general hiring quality for the roles it targets.\n"}
Resume:
${resume.trim()}

Score it out of 100. Be strict and specific: reward measurable impact, relevant keywords and clear structure; penalise vagueness, gaps and filler.

Reply with one JSON object and nothing else, no prose and no code fence:
{"score": <integer 0-100>, "summary": "<one sentence>", "strengths": ["..."], "gaps": ["..."]}
Keep strengths and gaps to at most three short items each.`;
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Pulls the verdict out of a reply. Models add fences and commentary despite
 * being told not to, so we take the widest brace-delimited span and parse it.
 * Returns null while the stream is still mid-object, or if it never came.
 */
export function parseVerdict(raw: string): AtsVerdict | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const score = Number(record.score);
  if (!Number.isFinite(score)) return null;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    summary: typeof record.summary === "string" ? record.summary : "",
    strengths: asStrings(record.strengths),
    gaps: asStrings(record.gaps),
  };
}

export interface ScoreConsensus {
  count: number;
  mean: number;
  min: number;
  max: number;
  /** max - min: how far apart the models are. */
  spread: number;
}

export function consensus(scores: number[]): ScoreConsensus | null {
  if (scores.length === 0) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return {
    count: scores.length,
    mean: Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length),
    min,
    max,
    spread: max - min,
  };
}
