// k6 load test for the anonymous online exam flow (docs/launch-checklist.md, gate 2).
//
//   k6 run -e BASE_URL=https://staging.example -e EXAM_SLUG=<slug> loadtest/exam.js
//
// Targets 300 concurrent participants. Never point this at production data you care about:
// every virtual user creates a real attempt. The exam must be open, public, with
// participant_cap >= 300 and max_attempts >= 1.
//
// The join, answer and submit endpoints rate limit per client IP. Behind Vercel each virtual
// user needs its own address, so a staging deployment must trust the X-Forwarded-For header
// set below (or run with LOAD_TEST_IPS spread across several runners). Otherwise most requests
// answer 429 and the run measures the limiter, not the exam.
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const EXAM_SLUG = __ENV.EXAM_SLUG;
const PARTICIPANTS = Number(__ENV.PARTICIPANTS || 300);

const rateLimited = new Rate('rate_limited');

export const options = {
  scenarios: {
    participants: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: PARTICIPANTS },
        { duration: '5m', target: PARTICIPANTS },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:answer}': ['p(95)<500'],
    'http_req_duration{name:join}': ['p(95)<1000'],
    'http_req_duration{name:questions}': ['p(95)<1500'],
    rate_limited: ['rate<0.01'],
  },
};

function headers(vu) {
  return {
    'Content-Type': 'application/json',
    'X-Forwarded-For': `10.${(vu >> 16) & 255}.${(vu >> 8) & 255}.${vu & 255}`,
  };
}

function answerFor(question) {
  const optionId = question.options.length > 0 ? question.options[0].id : null;
  return optionId ? { option_id: optionId } : { value: true };
}

export function setup() {
  if (!EXAM_SLUG) {
    throw new Error('EXAM_SLUG is required');
  }
}

export default function () {
  const params = { headers: headers(__VU) };

  group('join', () => {
    const joined = http.post(
      `${BASE_URL}/api/exam/join`,
      JSON.stringify({ slug: EXAM_SLUG, displayName: `Load ${__VU}-${__ITER}` }),
      { ...params, tags: { name: 'join' } },
    );
    rateLimited.add(joined.status === 429);
    check(joined, { joined: (r) => r.status === 200 });
    if (joined.status !== 200) {
      return;
    }

    const loaded = http.get(`${BASE_URL}/api/exam/questions?slug=${EXAM_SLUG}`, {
      ...params,
      tags: { name: 'questions' },
    });
    rateLimited.add(loaded.status === 429);
    check(loaded, { 'questions loaded': (r) => r.status === 200 });
    if (loaded.status !== 200) {
      return;
    }

    const questions = loaded.json('questions') || [];
    for (const question of questions) {
      sleep(5 + Math.random() * 10);
      const saved = http.post(
        `${BASE_URL}/api/exam/answer`,
        JSON.stringify({ slug: EXAM_SLUG, itemId: question.itemId, answer: answerFor(question) }),
        { ...params, tags: { name: 'answer' } },
      );
      rateLimited.add(saved.status === 429);
      check(saved, { 'answer saved': (r) => r.status === 200 });
    }

    const submitted = http.post(
      `${BASE_URL}/api/exam/submit`,
      JSON.stringify({ slug: EXAM_SLUG }),
      {
        ...params,
        tags: { name: 'submit' },
      },
    );
    rateLimited.add(submitted.status === 429);
    check(submitted, { submitted: (r) => r.status === 200 });
  });
}
