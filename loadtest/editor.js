// k6 load test for the signed-in editor surface (docs/launch-checklist.md, gate 2).
//
//   k6 run -e BASE_URL=https://staging.example -e COOKIE='sb-...=...' loadtest/editor.js
//
// Targets 50 concurrent editors. COOKIE is the session cookie header of a staging teacher
// account (copy it from the browser after signing in). It exercises the authenticated page
// renders that dominate editor traffic: home, bank, tests. Content edits go through server
// actions and Supabase RPCs, which are load tested at the database layer (pgTAP and the
// Supabase dashboard), not here.
import { check, sleep } from 'k6';
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const COOKIE = __ENV.COOKIE;
const EDITORS = Number(__ENV.EDITORS || 50);
const PAGES = ['/home', '/bank', '/tests', '/exams', '/reports'];

export const options = {
  scenarios: {
    editors: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: EDITORS },
        { duration: '5m', target: EDITORS },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
};

export function setup() {
  if (!COOKIE) {
    throw new Error('COOKIE is required');
  }
}

export default function () {
  for (const path of PAGES) {
    const response = http.get(`${BASE_URL}${path}`, { headers: { Cookie: COOKIE }, redirects: 0 });
    check(response, { [`${path} ok`]: (r) => r.status === 200 });
    sleep(2 + Math.random() * 6);
  }
}
