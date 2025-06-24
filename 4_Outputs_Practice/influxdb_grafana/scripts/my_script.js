import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const errors = new Counter('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp-up to 100 users over 1 minute
    { duration: '2m', target: 200 }, // Hold steady at 200 users for 2 minutes
    { duration: '1m', target: 0 },   // Ramp-down to 0 users over 1 minute
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // 95% of requests should complete below 400ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
  },
};

export default function () {

  const requestBodyLogin = JSON.stringify({
    "username": "default",
    "password": "12345678"
  });

  const requestHeaderLogin = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // First validate the login response
  const responseLogin = http.post('https://quickpizza.grafana.com/api/users/token/login', requestBodyLogin, requestHeaderLogin);

  if (responseLogin.status !== 200) {
    errors.add(1);
    return;
  }

  let responseData;
  try {
    responseData = JSON.parse(responseLogin.body);
  } catch (e) {
    errors.add(1);
    return;
  }

  if (!responseData || !responseData.token) {
    errors.add(1);
    return;
  }

  const tokenID = responseData.token;

  const requestBodyOrderPizza = JSON.stringify({
    "maxCaloriesPerSlice": 1000,
    "mustBeVegetarian": false,
    "excludedIngredients": [],
    "excludedTools": [],
    "maxNumberOfToppings": 5,
    "minNumberOfToppings": 2,
    "customName": ""
  });

  const requestHeaderOrderPizza = {
    headers: {
      'Content-Type': 'application/json',
      'authorization': 'Token ' + tokenID
    }
  };

  const responseOrderPizza = http.post('https://quickpizza.grafana.com/api/pizza', requestBodyOrderPizza, requestHeaderOrderPizza);

  let responsePizzaData;
  try {
    responsePizzaData = JSON.parse(responseOrderPizza.body);
  } catch (e) {
    errors.add(1);
    return;
  }

  // Additional validation for pizza order response
  if (!responsePizzaData) {
    errors.add(1);
    return;
  }

  if (!responsePizzaData.pizza) {
    errors.add(1);
    return;
  }

  check(responseOrderPizza, {
    'Order Pizza Status Code is 200': (r) => r.status === 200,
    'Pizza Name is not null': (r) => responsePizzaData && responsePizzaData.pizza && responsePizzaData.pizza.name !== null
  }, { check: 'Order Pizza' }) || errors.add(1);

  if (!responsePizzaData.pizza.id) {
    errors.add(1);
    return;
  }

  const pizzaID = responsePizzaData.pizza.id;

  const requestBodyRatePizza = JSON.stringify({
    "pizza_id": pizzaID,
    "stars": Math.floor(Math.random() * 6) + 1
  });

  const requestHeaderRatePizza = {
    headers: {
      'Content-Type': 'application/json',
      'authorization': 'Token ' + tokenID
    }
  };

  const responseRatePizza = http.post('https://quickpizza.grafana.com/api/ratings', requestBodyRatePizza, requestHeaderRatePizza);

  check(responseRatePizza, {
    'Rate Pizza Status Code is 201 or 200': (r) => r.status === 201 || r.status === 200
  }, { check: 'Rate Pizza' }) || errors.add(1);
}
