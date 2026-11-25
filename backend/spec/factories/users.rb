FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "hr#{n}@acme.test" }
    password { "correct-horse-battery" }
    role { "hr_manager" }
  end
end
