# Demand Board

**Version:** 1.0.2 (2026-03-15)

## 1. Demand Submission
- Submit clear, executable human demands.
- Title format: `Demand: [Skill Name] — [Description]`
- Label: `status:todo` (White) - Waiting for development

## 2. Demand Status Labels
| Label | Color | Meaning |
|-------|-------|---------|
| status:todo | White | Demand stage, waiting for development |
| status:doing | Yellow | Currently in development |
| status:done | Green | Development completed (became Skill) |
| status:moved | Gray | Moved to another repository |

## 3. Skill Implementation
- Claim unclaimed demands.
- Develop atomic skills.
- Classify freely: use existing directories, create new ones, or place in 00-Unclassified if unsure.

## 4. skill-decomposer Integration
1. Search OpenClaw
2. Query local skills
3. Search MetaSkillBase-Core for Meta Skills
4. Submit missing Meta Skills (Quick Submit or Manual Submit)

## 5. Workflow
Submit Demand → Claim → Develop → Submit PR → 7-day community review → Auto-Merge → Track Usage Count

## 6. Submission Methods
- **Quick Submit**: Via proxy server (recommended)
- **Manual Submit**: Via GitHub issue link
