FactoryBot.define do
  factory :employee do
    sequence(:full_name) { |n| "Employee #{n}" }
    sequence(:email) { |n| "employee#{n}@acme.test" }
    job_title { "Software Engineer" }
    department { "Engineering" }
    level { "L3" }
    country { "US" }
    salary { BigDecimal("100000.00") }
    hire_date { Date.new(2022, 1, 10) }
  end
end
