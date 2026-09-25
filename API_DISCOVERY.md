## Skiplagged API discovery

Target: `https://skiplagged.com/hotel/76955/luxor-las-vegas-nevada`

### Selected review source

- Endpoint: `GET https://skiplagged.com/api/hotel_review.php?hotel_id={hotel_id}`
- Auth: None observed.
- Request profile: Impit's Chrome profile with the supplied hotel page as `referer` and `https://skiplagged.com` as `origin`.
- Response: JSON, HTTP 200, approximately 1.7 MB for the sample hotel.
- Review records: 4,357 in `reviews.results.review_data` for the sample response.
- Fields: review identifier, rating, rating label, publication date, reviewer name, positive text, negative text, language markers, and structured text parts.
- Pagination: The endpoint returned the available review set in one response and exposed no page or cursor in the observed request. The actor batches it into 50-review output pages and applies `max_pages` locally.

### Candidate matrix

| Candidate                  | Profile                                   | Result                                                                         | Decision                                   |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| URLScan existing scans     | Public scan search for `skiplagged.com`   | Recent scan showed Cloudflare 403; older successful scans covered the homepage | Used for initial reconnaissance only       |
| Direct hotel HTML          | Desktop HTTP request                      | HTTP 403 from Cloudflare                                                       | Rejected                                   |
| Browser network inspection | Chromium browser on the target hotel page | Review JSON request returned HTTP 200                                          | Used only to confirm the endpoint          |
| Impit review request       | Chrome impersonation with referer/origin  | HTTP 200 and valid JSON with 4,357 sample reviews                              | Selected                                   |
| Hotel detail request       | Same browser/network investigation        | Returned broad hotel, room, rate, photo, and rating data                       | Rejected because this Actor is review-only |
| HTML or DOM parsing        | Not used                                  | Not required after the review JSON source was confirmed                        | Rejected                                   |

### Runtime decision

The actor is fully HTTP and JSON based. Browser automation was used only to observe network requests because the normal page request was protected by Cloudflare. Runtime extraction creates one Impit client per target URL, requests only the review endpoint, retries transient HTTP failures, and always routes requests through Apify Residential Proxy. Direct worker requests can receive Cloudflare 403 responses, so residential routing is mandatory and enforced in runtime code regardless of the supplied input. Local `INPUT.json` reflects the Residential Proxy configuration; local runs therefore require an Apify account with Residential Proxy access. No cookies, authorization tokens, or response secrets are logged or required.
