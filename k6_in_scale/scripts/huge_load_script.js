import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const errors = new Counter('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 }, // Ramp-up to 20 users over 1 minute
    { duration: '2m', target: 50 }, // Hold steady at 50 users for 2 minutes
    { duration: '3m', target: 0 }, // Ramp-down to 0 user for 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // 95% of requests should complete below 400ms
    http_req_failed: ['rate<0.01'],   // Fewer than 1% of requests should fail
  },
};

// Base URL of the target API
const BASE_URL = 'https://jsonplaceholder.typicode.com'; // Replace with your authorized API

export default function () {
  // Simulate different groups of user behavior
  group('User Scenario: Create, Read, and Delete Posts', function () {
    // 1. Create a new post
    const payload = JSON.stringify({
      title: `Post Title ${Math.random()}`,
      body: 'This is a test post body.',
      userId: 1,
    });

    const headers = {
      'Content-Type': 'application/json',
    };

    const createRes = http.post(`${BASE_URL}/posts`, payload, { headers });
    check(createRes, {
      'POST /posts status is 201': (r) => r.status === 201,
      'POST /posts response has ID': (r) => JSON.parse(r.body).id !== undefined,
    }) || errors.add(1);

    const postId = JSON.parse(createRes.body).id;

    // 2. Retrieve the created post
    const getRes = http.get(`${BASE_URL}/posts/${postId}`);
    check(getRes, {
      'GET /posts/{id} status is 200': (r) => r.status === 200,
      'GET /posts/{id} contains title': (r) => JSON.parse(r.body).title !== undefined,
    }) || errors.add(1);

    // 3. Delete the created post
    const deleteRes = http.del(`${BASE_URL}/posts/${postId}`);
    check(deleteRes, {
      'DELETE /posts/{id} status is 200': (r) => r.status === 200,
    }) || errors.add(1);

    sleep(1); // Simulate user think time
  });

  group('User Scenario: Retrieve Posts and Comments', function () {
    // 1. List posts
    const listRes = http.get(`${BASE_URL}/posts`);
    check(listRes, {
      'GET /posts status is 200': (r) => r.status === 200,
      'GET /posts response contains posts': (r) => JSON.parse(r.body).length > 0,
    }) || errors.add(1);

    // 2. Get comments for the first post
    const postId = JSON.parse(listRes.body)[0].id;
    const commentsRes = http.get(`${BASE_URL}/posts/${postId}/comments`);
    check(commentsRes, {
      'GET /posts/{id}/comments status is 200': (r) => r.status === 200,
      'GET /posts/{id}/comments contains comments': (r) => JSON.parse(r.body).length > 0,
    }) || errors.add(1);

    sleep(1); // Simulate user think time
  });
}

