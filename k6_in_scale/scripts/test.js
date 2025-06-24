import http from 'k6/http';
import { sleep, check } from 'k6';

// Test options
export const options = {
  stages: [
    { duration: '1m', target: 20 }, // Ramp-up to 20 users over 1 minute
    { duration: '2m', target: 50 }, // Hold steady at 50 users for 2 minutes
    { duration: '3m', target: 100 }, // Ramp-down to 0 user for 2 minutes
    { duration: '2m', target: 60 }, // Ramp-down to 0 user for 2 minutes
    { duration: '1m', target: 0 }, // Ramp-down to 0 user for 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be under 500ms
    http_req_failed: ['rate<0.01'],   // < 1% should fail
  },
};

const BASE_URL = 'https://catfact.ninja/fact';

export default function () {
  // Make GET request
  const res = http.get(BASE_URL);

  // Validate response
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response body has fact': (r) => JSON.parse(r.body).fact !== undefined,
  });

  sleep(1); // simulate think time
}