# EDM Analytic Dashboard - Feature Requirements

## Project Overview

**Project Name:** EnGenius EDM Analytic Dashboard
**Version:** 1.2
**Last Updated:** January 2026
**Data Source:** Mailchimp Marketing API

### Purpose
Provide the EnGenius marketing team with a unified analytics platform to monitor email campaign performance across all global regions, enabling data-driven decision making and performance optimization.

---

## Core Features

### 1. Home Dashboard (Overview)

The main landing page providing a global view of all regional campaign performance.

#### 1.1 Executive Summary
- **Total Campaigns / Total Sent / Regions** - Overview stats bar
- **Top Region** - Region with highest composite score (Open + Click + Delivery rates)
- **Needs Attention** - Region with lowest composite score, with info tooltip explaining selection criteria
- **Inactive Regions** - Regions with no campaigns in >30 days
- **Alerts** - Region-level warnings (high bounce, high unsub, low activity, low engagement)

#### 1.2 KPI Cards
Global aggregated metrics displayed in card format:

| Metric | Description |
|--------|-------------|
| Total Campaigns | Number of campaigns in selected period |
| Total Subscribers | Active subscriber count across audiences |
| Total Emails Sent | Cumulative emails delivered |
| Delivery Rate | Successfully delivered / Total sent (%) |
| Avg. Open Rate | Average open rate with trend indicator |
| Avg. Click Rate | Average click-through rate with trend indicator |
| Bounce Rate | Hard + soft bounces percentage |
| Unsubscribe Rate | Opt-out percentage |

#### 1.3 Time Series Chart
Interactive line chart showing metrics trends over time:
- Supports multiple metric overlays
- Region filtering capability
- Hover tooltips with detailed values

#### 1.4 Region Cards
Visual cards for each region displaying:
- Region flag and name
- Campaign count
- Key performance metrics (Open Rate, Click Rate)
- Click to drill down to region detail

---

### 2. Region Detail Dashboard (Second Level)

Detailed view for individual region performance analysis.

#### 2.1 Executive Summary (Region-specific)
- **Total Emails Sent** - Region total with campaign count
- **Audience** - Currently selected audience name
- **Last Campaign** - Most recent campaign date (warning if >30 days)
- **Needs Review** - Campaign with lowest composite score (below Open/Click/Delivery thresholds)
- **High Bounce Rate Campaigns** - Lists specific campaigns with >5% bounce rate
- **High Unsubscribe Rate Campaigns** - Lists specific campaigns with >1% unsub rate

#### 2.2 KPI Cards
Same metrics as Home Dashboard, filtered to selected region.

#### 2.3 Performance Charts
- Open Rate trend over time
- Click Rate trend over time
- Delivery metrics visualization

#### 2.4 Campaign List Table
Detailed table of all campaigns with the following columns:

| Column | Description |
|--------|-------------|
| Campaign | Campaign title/subject line (clickable link to Mailchimp archive) |
| Send Time | Date and time of campaign send |
| Audience | Target audience/list name |
| Emails Sent | Number of emails delivered |
| Opens | Total open count |
| Open Rate | Opens / Delivered (%) |
| Clicks | Total click count |
| Click Rate | Clicks / Opens (%) |
| Bounces | Failed deliveries |
| Unsubscribes | Opt-outs from this campaign |

**Table Features:**
- **Clickable Campaign Titles** - Opens Mailchimp's public archive URL in new tab
- Sortable columns (click header to sort)
- Pagination (10/25/50/100 items per page)
- Row dividers for improved readability
- Campaign count display in header

---

### 3. MoM/QoQ Comparison

Automatic period-over-period comparison for trend analysis.

#### Logic
- Selected period is split at midpoint
- Current half compared against previous half
- Trend indicators show % change

#### Display
- Green up arrow: Positive improvement
- Red down arrow: Negative decline
- Only shown when sufficient data exists in both periods

#### Labels
| Period Length | Comparison Label |
|--------------|------------------|
| 90+ days | "vs prev quarter" |
| 30-89 days | "vs prev month" |
| < 30 days | "vs prev period" |

---

## Auxiliary Functions

### 4. Data Sync
- **Manual Sync Button** - Trigger fresh data pull from Mailchimp API
- **Last Sync Time** - Display timestamp of most recent data refresh
- **Loading States** - Visual feedback during sync operations

### 5. Export Function
Export dashboard content for reporting and sharing.

#### Supported Formats
| Format | Description |
|--------|-------------|
| PNG | High-resolution image (2x scale) |

#### Export Includes
- Report header with EnGenius branding
- Current filter selections (date range, region, audience)
- Generation timestamp
- All visible dashboard content
- Footer with copyright and data source

### 6. Share Link Function
Share dashboard views with preserved filter settings, with optional password protection and expiration.

#### Features
- **URL State Persistence** - Filter selections automatically saved to URL
- **Quick Share** - One-click copy of current URL to clipboard
- **Protected Links** - Create share links with optional password and expiration
- **Visual Feedback** - Confirmation when link is copied

#### Share Dialog Options
| Option | Description |
|--------|-------------|
| Quick Copy | Copy current URL directly (no protection) |
| Password | Optional password protection for sensitive data |
| Expiration | Link validity: 1 day, 7 days, 30 days, or never |

#### Protected Link Features
- **Password Protection** - Recipients must enter password to view
- **Auto Expiration** - Links automatically become invalid after set period
- **Access Count** - Track how many times a link has been accessed
- **Token-based URLs** - Short URLs like `/s/abc123` for protected links

#### Supported URL Parameters (Direct Links)
| Parameter | Description | Example |
|-----------|-------------|---------|
| `days` | Time range preset | 7, 30, 60, 90, 180, 365 |
| `startDate` | Custom range start | 2024-01-01 |
| `endDate` | Custom range end | 2024-03-31 |
| `region` | Region filter | TW, US, EU, APAC |
| `audience` | Audience ID filter | abc123xyz |
| `view` | Dashboard view | overview, region-detail |

#### Usage
1. Configure desired filters
2. Click "Share" button
3. Choose:
   - **Quick Share**: Copy URL directly for internal use
   - **Protected Link**: Set password/expiration for external sharing
4. Share the generated link with colleagues
5. Recipients see exact same filtered view (after password verification if required)

### 7. Alert Settings
Configurable threshold alerts for key metrics:
- Open Rate minimum threshold
- Click Rate minimum threshold
- Bounce Rate maximum threshold
- Visual warnings when thresholds exceeded

### 8. API Diagnostics
Developer tool for troubleshooting:
- API endpoint status
- Response times
- Error logging
- Force refresh capability

---

## Filter Controls

### Time Range Selector
| Option | Description |
|--------|-------------|
| Last 7 Days | Recent week |
| Last 30 Days | Recent month |
| Last 90 Days | Recent quarter |
| Last 180 Days | Recent 6 months |
| Last 365 Days | Recent year |
| Custom Range | Date picker for specific range |

### Region Selector
- "All Regions" - Aggregate view
- Individual region selection
- Dynamic list based on available data

### Audience Selector
- Available only in Region Detail view
- Filter campaigns by specific audience/list
- "All Audiences" default option

---

## Responsive Design

### Desktop (1024px+)
- Full sidebar navigation
- Multi-column card layouts
- Complete data tables
- All labels and descriptions visible

### Tablet (768px - 1023px)
- Condensed navigation
- 2-column card layouts
- Horizontal scrolling tables
- Abbreviated labels where needed

### Mobile (< 768px)
- Logo hidden to save space
- Single column layouts
- Stacked cards
- Simplified table view
- Touch-optimized controls
- Shortened button labels

---

## Technical Specifications

### Frontend Stack
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Tailwind CSS | Styling |
| Recharts | Data visualization |
| Lucide React | Icon library |
| html2canvas | PNG export generation |

### Backend Stack
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express | API server |
| Mailchimp Marketing API | Data source |

### Data Refresh
- Manual sync via UI button
- Cached responses for performance
- Force refresh option available

---

## Brand Guidelines

### Colors
| Usage | Color | Hex |
|-------|-------|-----|
| Primary | Teal | #007C89 |
| Accent | Yellow | #FFE01B |
| Text | Dark Brown | #241C15 |
| Background | Light Gray | #F6F6F4 |

### Typography
- **Font Family:** Inter (Google Fonts)
- **Page Titles:** 24px/28px, Bold
- **Section Titles:** 18px/20px, Bold with accent bar
- **Body Text:** 14px, Regular

### Visual Elements
- Section titles include colored accent bar (teal or yellow)
- Cards have subtle shadow and hover effects
- Consistent border radius (8px/12px)
- Gradient backgrounds for headers

---

## SEO Configuration

Dashboard is configured to prevent search engine indexing:
- `robots.txt` with `Disallow: /`
- Meta tag `<meta name="robots" content="noindex, nofollow">`

---

## Future Enhancements

### Planned Features
1. **Automated Reports** - Scheduled email delivery of dashboard snapshots
2. **A/B Test Analysis** - Compare campaign variants
3. **Subscriber Growth** - Track audience growth over time
4. **Revenue Attribution** - Link campaigns to conversion data
5. **Custom Dashboards** - User-configurable widget layouts

### Integration Opportunities
- Google Analytics connection
- CRM integration (Salesforce, HubSpot)
- Slack notifications for alerts
- API access for external tools

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial feature documentation |
| 1.1 | Jan 2026 | Added URL state persistence & share link feature, clickable campaign titles, simplified export to PNG only, improved chart legend styling |
| 1.2 | Jan 2026 | Enhanced share link with password protection and expiration options, share link database storage |
