# Recommendation Design

## Objective
Build a deterministic recommendation engine that ranks published opportunities for students based on profile signals, without requiring an AI API key or long questionnaires.

## Signals Used
- Profile: subjects, interests, career_interests, education_level, dream_universities
- Opportunity: title, description, subject_area, type, tags, cost, deadline, is_online, source_type, verification_status

## Scoring Weights
- Keyword match (profile keywords in opportunity text): up to 6 pts
- Subject match (subject_area overlap): up to 6 pts
- Category match (opportunity type mapped to interests): up to 4 pts
- Eligibility compatibility (education/grade_requirements): up to 4 pts
- Funding preference (free/fully funded detection): up to 4 pts
- Online preference: up to 2 pts
- Recency: up to 2 pts

## Eligibility Rules
- Hard exclusion: never recommend unverified/rejected/raw discovery candidates
- Uncertain eligibility when grade_requirements are present but don't clearly include/exclude student level
- Funding: only claim "fully funded" when cost or description explicitly includes "free", "fully funded", or "scholarship included"
- Never invent eligibility requirements

## Privacy
- Ranking performed server-side
- No exposure of raw discovery or verification evidence
- Profile data not exposed in public responses
