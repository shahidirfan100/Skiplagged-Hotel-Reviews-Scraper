import { Actor, log } from 'apify';
import { Impit } from 'impit';

await Actor.init();

const API_ORIGIN = 'https://skiplagged.com';
const REVIEW_PAGE_SIZE = 50;

const sleep = (milliseconds) =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

function omitEmpty(value) {
    if (Array.isArray(value)) {
        const result = value.map(omitEmpty).filter((item) => item !== undefined);
        return result.length ? result : undefined;
    }

    if (value && typeof value === 'object') {
        const result = {};
        for (const [key, child] of Object.entries(value)) {
            const cleaned = omitEmpty(child);
            if (cleaned !== undefined) result[key] = cleaned;
        }
        return Object.keys(result).length ? result : undefined;
    }

    if (value === null || value === undefined || value === '') return undefined;
    return value;
}

function asNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

function normaliseUrls(input) {
    const values = Array.isArray(input.startUrls) ? input.startUrls : [];
    return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];
}

function parseHotelUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`Invalid hotel URL: ${value}`);
    }

    if (!/(^|\.)skiplagged\.com$/i.test(url.hostname)) {
        throw new Error(`URL must belong to skiplagged.com: ${value}`);
    }

    const match = url.pathname.match(/\/hotel\/(\d+)(?:\/|$)/i);
    if (!match) throw new Error(`Could not find a Skiplagged hotel ID in URL: ${value}`);

    return {
        hotelId: match[1],
        sourceUrl: url.href,
        referer: url.href,
    };
}

async function fetchJson(client, url, referer) {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await client.fetch(url, {
                headers: {
                    referer,
                    origin: API_ORIGIN,
                },
            });

            const body = await response.text();
            if (!response.ok) {
                if (attempt < maxAttempts && [403, 408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
                    log.warning(`Retrying request after HTTP ${response.status} (attempt ${attempt}/${maxAttempts})`);
                    await sleep(500 * 2 ** (attempt - 1));
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            try {
                return JSON.parse(body);
            } catch {
                throw new Error('The response was not valid JSON');
            }
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            log.warning(`Retrying request after ${error.message} (attempt ${attempt}/${maxAttempts})`);
            await sleep(500 * 2 ** (attempt - 1));
        }
    }

    throw new Error('Request failed');
}

function extractReviews(payload) {
    const reviewData = payload?.reviews?.results?.review_data;
    if (!reviewData || typeof reviewData !== 'object') return [];

    return Object.entries(reviewData).map(([reviewId, review]) => ({
        reviewId,
        ...review,
    }));
}

function filterReviews(reviews, filter) {
    switch (filter) {
        case 'positive':
        case 'rating_8_plus':
            return reviews.filter((review) => asNumber(review.average_rating) >= 8);
        case 'negative':
        case 'rating_5_or_less':
            return reviews.filter((review) => asNumber(review.average_rating) <= 5);
        case 'with_text':
            return reviews.filter((review) => review.good_description || review.bad_description);
        default:
            return reviews;
    }
}

function sortReviews(reviews, sortBy) {
    const sorted = [...reviews];
    sorted.sort((left, right) => {
        if (sortBy === 'oldest' || sortBy === 'newest') {
            const comparison = String(left.creation_date || '').localeCompare(String(right.creation_date || ''));
            return sortBy === 'oldest' ? comparison : -comparison;
        }

        const leftRating = asNumber(left.average_rating) ?? -1;
        const rightRating = asNumber(right.average_rating) ?? -1;
        return sortBy === 'lowest_rating' ? leftRating - rightRating : rightRating - leftRating;
    });
    return sorted;
}

function reviewFields(review) {
    return {
        review_id: review.reviewId,
        reviewer_name: review.user_name,
        review_rating: asNumber(review.average_rating),
        review_rating_description: review.average_rating_description,
        review_date: review.creation_date,
        positive_review: review.good_description,
        positive_review_language: review.good_description_language,
        negative_review: review.bad_description,
        negative_review_language: review.bad_description_language,
        positive_review_parts: review.good_description_parts,
        negative_review_parts: review.bad_description_parts,
    };
}

async function run() {
    const input = (await Actor.getInput()) || {};
    const urls = normaliseUrls(input);
    const resultsWantedRaw = input.results_wanted ?? 20;
    const maxPagesRaw = input.max_pages ?? 10;
    const resultsWanted = Number.isFinite(+resultsWantedRaw) ? Math.max(1, Math.floor(+resultsWantedRaw)) : 20;
    const maxPages = Number.isFinite(+maxPagesRaw) ? Math.max(1, Math.floor(+maxPagesRaw)) : 10;
    const sortBy = input.sortBy ?? input.sort_by ?? 'newest';
    const filter = input.filter ?? input.review_filter ?? 'all';

    if (!urls.length) {
        throw new Error('Provide at least one Skiplagged hotel URL in startUrls.');
    }

    const { proxyConfiguration } = input;
    const shouldUseProxy = Boolean(
        proxyConfiguration?.useApifyProxy ||
        (Array.isArray(proxyConfiguration?.proxyUrls) && proxyConfiguration.proxyUrls.length),
    );
    const proxy = shouldUseProxy ? await Actor.createProxyConfiguration(proxyConfiguration) : undefined;

    log.info(
        `Starting Skiplagged hotel reviews run | urls=${urls.length} | results=${resultsWanted} | max_pages=${maxPages}`,
    );
    let totalSaved = 0;
    const seenHotelIds = new Set();

    for (const inputUrl of urls) {
        if (totalSaved >= resultsWanted) break;

        const target = parseHotelUrl(inputUrl);
        if (seenHotelIds.has(target.hotelId)) {
            log.info(`Skipping duplicate hotel URL for hotel ${target.hotelId}`);
            continue;
        }
        seenHotelIds.add(target.hotelId);
        const proxyUrl = proxy ? await proxy.newUrl() : undefined;
        const client = new Impit({
            browser: 'chrome',
            ignoreTlsErrors: true,
            ...(proxyUrl && { proxyUrl }),
        });

        const reviewEndpoint = `${API_ORIGIN}/api/hotel_review.php?hotel_id=${encodeURIComponent(target.hotelId)}`;
        const reviewPayload = await fetchJson(client, reviewEndpoint, target.referer);
        const reviews = sortReviews(filterReviews(extractReviews(reviewPayload), filter), sortBy);
        const limitedReviews = reviews.slice(0, Math.min(resultsWanted - totalSaved, maxPages * REVIEW_PAGE_SIZE));

        if (!limitedReviews.length) {
            log.warning(`No matching reviews found for hotel ${target.hotelId}`);
            continue;
        }

        for (let page = 0; page < limitedReviews.length; page += REVIEW_PAGE_SIZE) {
            if (totalSaved >= resultsWanted) break;
            const batch = limitedReviews.slice(page, page + REVIEW_PAGE_SIZE).map((review) =>
                omitEmpty({
                    hotel_id: asNumber(target.hotelId),
                    hotel_url: target.sourceUrl,
                    ...reviewFields(review),
                    source: 'skiplagged.com',
                }),
            );
            const remaining = resultsWanted - totalSaved;
            const output = batch.slice(0, remaining);
            await Actor.pushData(output);
            totalSaved += output.length;
            log.info(
                `Saved review page ${Math.floor(page / REVIEW_PAGE_SIZE) + 1} for hotel ${target.hotelId} | batch=${output.length} | total=${totalSaved}/${resultsWanted}`,
            );
        }
    }

    log.info(`Finished | saved=${totalSaved} | requested=${resultsWanted}`);
}

try {
    await run();
} finally {
    await Actor.exit();
}
