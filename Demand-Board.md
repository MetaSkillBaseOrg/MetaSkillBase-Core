# Demand Board

**Version:** 1.0.1 (2026-03-12)

## 1. Demand Submission
- Submit clear, executable human demands.
- Title format: `Demand: [Skill Name] – [Description]`
- Label: `status:todo` (white) - Waiting for development

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
- Place in correct category.

## 4. skill-decomposer Integration
1. Search OpenClaw
2. Query local skills
3. Search MetaSkillBase-Core for Meta Skills
4. Record missing Meta Skills

## 5. Workflow
Submit Demand → Claim → Develop → Merge → Track Usage Count
