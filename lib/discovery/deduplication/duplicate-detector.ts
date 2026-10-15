export interface DuplicateCheck {
  isDuplicate: boolean;
  duplicateOfId?: string;
  similarityScore: number;
}

export class DuplicateDetector {
  compare(candidateA: { url: string; title: string; id?: string }, candidateB: { url: string; title: string; id?: string }): DuplicateCheck {
    if (candidateA.url === candidateB.url) {
      return { isDuplicate: true, similarityScore: 1.0, duplicateOfId: candidateB.id || candidateA.id || undefined };
    }
    // Simple title similarity for demonstration
    const aTitle = (candidateA.title || "").toLowerCase();
    const bTitle = (candidateB.title || "").toLowerCase();
    const score = this.stringSimilarity(aTitle, bTitle);
    if (score > 0.85 && candidateA.url && candidateB.url) {
      return { isDuplicate: true, similarityScore: score, duplicateOfId: candidateB.id || candidateA.id || undefined };
    }
    return { isDuplicate: false, similarityScore: score };
  }

  private stringSimilarity(a: string, b: string): number {
    const setA = new Set(a.split(" ").filter((w) => w.length > 3));
    const setB = new Set(b.split(" ").filter((w) => w.length > 3));
    const inter = [...setA].filter((w) => setB.has(w));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? inter.length / union.size : 0;
  }
}
