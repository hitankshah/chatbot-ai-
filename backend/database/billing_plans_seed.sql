-- Seed billing plans for PayPal mapping
-- Update paypal_plan_id values after creating plans in PayPal

INSERT INTO billing_plans (plan_code, name, description, paypal_plan_id, interval_unit, price_cents, currency, limits, is_active)
VALUES
  (
    'starter',
    'Starter',
    'For early-stage teams launching their first bot.',
    NULL,
    'month',
    3900,
    'USD',
    '{"chatbots":1,"messages_per_month":4000,"pages":1000,"members":1}',
    true
  ),
  (
    'growth',
    'Growth',
    'Scale support operations with integrations + lead capture.',
    NULL,
    'month',
    7900,
    'USD',
    '{"chatbots":2,"messages_per_month":10000,"pages":10000,"members":4}',
    true
  ),
  (
    'scale',
    'Scale',
    'Higher throughput for large teams.',
    NULL,
    'month',
    25900,
    'USD',
    '{"chatbots":3,"messages_per_month":40000,"pages":50000,"members":10}',
    true
  ),
  (
    'enterprise',
    'Enterprise',
    'Custom contract with dedicated support.',
    NULL,
    'month',
    NULL,
    'USD',
    '{"chatbots":1000,"messages_per_month":1000000,"pages":500000,"members":1000}',
    true
  );
