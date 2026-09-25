## What does Skiplagged Hotel Reviews Scraper do?

Skiplagged Hotel Reviews Scraper collects public guest reviews from Skiplagged hotel pages and saves one clean dataset item per review. Add one or more hotel URLs, choose the review order and filter, then export structured guest feedback with the source hotel ID and URL.

It supports standard Skiplagged hotel links, links with a trailing slash, and hotel links that include check-in and check-out dates. The supplied URL is preserved in every matching review record.

## Why use Skiplagged Hotel Reviews Scraper?

- **Reputation monitoring** - Track recent guest feedback and recurring praise or complaints.
- **Hospitality research** - Compare review scores, dates, and guest comments.
- **Sentiment preparation** - Keep positive and negative comments in separate fields.
- **Clean records** - Empty and unavailable values are omitted instead of saved as `null`.
- **Flexible collection** - Run one hotel or a group of hotel URLs with a shared result limit.
- **Automation-ready output** - Schedule runs, download JSON, CSV, Excel, or XML, and connect datasets to Apify integrations.

## What review data can you extract from Skiplagged?

| Field                                                  | Description                                                |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `hotel_id`                                             | Numeric Skiplagged hotel identifier for the review source. |
| `hotel_url`                                            | Hotel URL supplied in the input.                           |
| `review_id`                                            | Source review identifier.                                  |
| `reviewer_name`                                        | Published reviewer display name.                           |
| `review_rating`                                        | Individual review score.                                   |
| `review_rating_description`                            | Label such as Exceptional, Good, or Poor.                  |
| `review_date`                                          | Review publication date.                                   |
| `positive_review`                                      | Guest's positive feedback when available.                  |
| `negative_review`                                      | Guest's critical feedback when available.                  |
| `positive_review_language`, `negative_review_language` | Published language markers.                                |
| `positive_review_parts`, `negative_review_parts`       | Structured text parts when published.                      |
| `source`                                               | Source website name.                                       |

Fields that Skiplagged does not publish for a particular review are left out of that item.

## How to use Skiplagged Hotel Reviews Scraper

1. Open the Actor in Apify Console.
2. Add one or more public Skiplagged hotel URLs.
3. Select the order and filter you want.
4. Set `results_wanted` and `max_pages`.
5. Run the Actor and inspect the dataset preview.
6. Export the review records or connect the dataset to your workflow.

## Input Parameters

| Parameter            | Type             | Required                  | Default                 | Description                                                                                         |
| -------------------- | ---------------- | ------------------------: | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `startUrls`          | Array of strings | Yes                       | Sample Luxor URL        | One or more Skiplagged hotel URLs.                                                                  |
| `sortBy`             | String           | No                        | `newest`                | `newest`, `oldest`, `highest_rating`, or `lowest_rating`.                                           |
| `filter`             | String           | No                        | `all`                   | `all`, `with_text`, `positive`, `negative`, `rating_8_plus`, or `rating_5_or_less`.                 |
| `results_wanted`     | Integer          | No                        | `20`                    | Maximum review records across the run.                                                              |
| `max_pages`          | Integer          | No                        | `10`                    | Maximum 50-review output pages per hotel.                                                           |
| `proxyConfiguration` | Object           | Automatically enforced   | Residential Apify Proxy | Residential routing is mandatory; the Actor enables it even if this input is omitted or changed. |

Residential Apify Proxy is required for requests to Skiplagged and is configured automatically. You do not need to provide proxy settings; the Actor always uses the Residential group and does not send direct requests. Your Apify account must have access to Residential Proxy, or the run will fail while configuring the proxy.

The source returns the available review set in one response. `max_pages` is a safety cap on local 50-review batches, which lets you limit larger review runs.

## Usage Examples

### Basic extraction

Collect the newest 20 reviews from one hotel:

```json
{
    "startUrls": ["https://skiplagged.com/hotel/76955/luxor-las-vegas-nevada"],
    "results_wanted": 20
}
```

### Multiple hotel URLs

Collect reviews from several hotel pages and stop after 100 records in total:

```json
{
    "startUrls": ["https://skiplagged.com/hotel/76955/luxor-las-vegas-nevada", "https://skiplagged.com/hotel/12984306"],
    "results_wanted": 100,
    "max_pages": 2
}
```

### Filtered and sorted extraction

Keep reviews scored 8 or higher and show the highest ratings first:

```json
{
    "startUrls": ["https://skiplagged.com/hotel/76955/luxor-las-vegas-nevada/2026-08-24/2026-08-25"],
    "sortBy": "highest_rating",
    "filter": "rating_8_plus",
    "results_wanted": 50,
    "max_pages": 1
}
```

## Sample Output

```json
{
    "hotel_id": 76955,
    "hotel_url": "https://skiplagged.com/hotel/76955/luxor-las-vegas-nevada",
    "review_id": "review_1",
    "reviewer_name": "Ray",
    "review_rating": 9,
    "review_rating_description": "Wonderful",
    "review_date": "2026-08-22",
    "positive_review": "Very clean room and helpful check in staff",
    "negative_review": "A little far down the strip also we had two rooms and they were on separate floors",
    "source": "skiplagged.com"
}
```

## Tips for Best Results

- Use complete public hotel URLs copied from Skiplagged.
- Start with `results_wanted: 20` to confirm the input and output shape.
- Use `with_text` when you need written feedback rather than score-only reviews.
- Use `max_pages` to cap larger collections at predictable 50-review batches.
- Review the dataset preview before scheduling repeated monitoring runs.
- Ensure your Apify account has Residential Proxy access; proxy routing is mandatory.

## Integrations and exports

Apify datasets can be downloaded as JSON, CSV, Excel, XML, and other formats. Use schedules for recurring monitoring, webhooks for run notifications, or integrations such as Google Sheets, Make, and Zapier for downstream workflows.

## Frequently Asked Questions

### Can I use a URL with dates?

Yes. Hotel URLs with check-in and check-out segments are accepted, as are base hotel URLs without dates.

### Is a residential proxy required?

Yes. Skiplagged can return Cloudflare 403 responses to direct worker requests. The Actor automatically routes requests through Apify Residential Proxy, and this cannot be disabled. Your Apify account must have access to Residential Proxy.

### Can I collect reviews from multiple hotels?

Yes. Add multiple strings to `startUrls`; `results_wanted` applies to the total review dataset across the run.

### Can I export the results to CSV or Excel?

Yes. Apify supports CSV, Excel, JSON, XML, and other dataset export formats.

### What happens when a field is unavailable?

The field is omitted from that record. The Actor does not add always-empty or always-null values.

### Is it legal to collect Skiplagged reviews?

Public data collection can be subject to laws, contracts, and website rules. You are responsible for complying with Skiplagged's terms, applicable law, privacy requirements, and responsible-use practices.

## Related Actors

- [Trip.com Hotel Reviews Scraper](https://apify.com/shahidirfan/trip-com-hotel-reviews-scraper) - Collect hotel reviews and guest insights from Trip.com.
- [HRS Reviews Scraper](https://apify.com/shahidirfan/hrs-reviews-scraper) - Collect structured hotel reviews from HRS.

## Support

For issues or feature requests, use the Actor's Issues tab on Apify or contact the developer through the Apify profile.

## Legal Notice

This Actor is intended for legitimate collection of publicly available hotel review data. Users are responsible for using the output lawfully, respecting source-site terms, and protecting any personal information contained in public reviews.
