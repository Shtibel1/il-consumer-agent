# Contributing to IL Consumer Agent

Thank you for your interest in contributing! This guide will help you get started.

## 🎯 Priority Contributions

The most impactful contributions are:

1. **Company data updates** - Contact information changes frequently
2. **New companies** - Expanding coverage helps more people
3. **Source verification** - Confirming existing data with official sources
4. **Hebrew translations** - Improving user-facing text

## 📦 Adding a New Company

### Step 1: Research

Before adding a company, gather:
- Official website URL
- All contact channels (phone, email, fax, web form, WhatsApp, app)
- Escalation path (service → manager → ombudsman → regulator)
- The relevant regulator for complaints
- SLA information if publicly available

**Important**: Every piece of information needs a source URL.

### Step 2: Create the JSON File

Create a new file in `src/data/companies/[company-id].json`:

```json
{
  "id": "company-id",
  "name": "Company Name in English",
  "nameHe": "שם החברה בעברית",
  "industry": "telecom",
  "website": "https://www.company.co.il",
  "contactChannels": [
    {
      "type": "phone",
      "value": "*123",
      "description": "Customer service",
      "sourceUrl": "https://www.company.co.il/contact",
      "verified": true
    }
  ],
  "escalationLadder": [
    {
      "level": 1,
      "name": "Customer Service",
      "nameHe": "שירות לקוחות",
      "description": "First line support",
      "descriptionHe": "קו ראשון של שירות",
      "channels": [],
      "typicalResponseDays": 1,
      "sourceUrl": "https://...",
      "verified": true
    }
  ],
  "slaInfo": [
    {
      "scenario": "cancellation",
      "maxResponseDays": 3,
      "maxResolutionDays": 6,
      "sourceUrl": "https://...",
      "verified": true
    }
  ],
  "consumerRights": [],
  "regulator": {
    "name": "Regulator Name",
    "nameHe": "שם הרגולטור",
    "website": "https://...",
    "complaintUrl": "https://..."
  },
  "keywords": ["company", "keywords"],
  "keywordsHe": ["מילות", "מפתח"],
  "stats": {
    "totalRequests": 0,
    "avgResponseDays": 0,
    "successRate": 0,
    "escalationRate": 0,
    "byScenario": {}
  },
  "lastUpdated": "2024-01-15"
}
```

### Step 3: Register the Company

Add your company to `src/data/companies/index.ts`:

```typescript
import newCompanyData from './new-company.json';

export const companies: Company[] = [
  // ... existing companies
  newCompanyData as unknown as Company,
];
```

### Step 4: Test

Run the test suite to ensure nothing is broken:

```bash
npm test
```

### Step 5: Submit PR

Create a pull request with:
- The new JSON file
- Updated index.ts
- A description of your sources

## ✅ Verification Guidelines

### What Counts as Verified

- ✅ Official company website
- ✅ Government/regulator website
- ✅ Official social media accounts
- ✅ Press releases from the company
- ✅ Regulatory filings

### What Does NOT Count

- ❌ Third-party aggregator sites
- ❌ User forums or reviews
- ❌ Outdated news articles
- ❌ Personal experience without documentation

### Marking Unverified Data

If you can't find an official source, you can still add the data with:

```json
{
  "value": "*123",
  "verified": false,
  "notes": "To verify - found on third-party site"
}
```

This helps track what needs verification later.

## 🔧 Development Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

## 📝 Code Style

- TypeScript for all new code
- Use existing patterns and types
- Keep Hebrew text in `*He` properties
- Add tests for new services
- Document complex logic

## 🐛 Reporting Issues

When reporting issues:

1. Check existing issues first
2. Include steps to reproduce
3. Specify browser/OS if relevant
4. Attach screenshots for UI issues

## 📋 Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`npm test`)
5. Submit PR with clear description
6. Wait for review

## 🤝 Code of Conduct

- Be respectful and constructive
- Focus on helping Israeli consumers
- Never share personal information
- Respect intellectual property

## ❓ Questions?

Open an issue with the "question" label or reach out to maintainers.

---

Thank you for helping Israeli consumers! 🇮🇱
