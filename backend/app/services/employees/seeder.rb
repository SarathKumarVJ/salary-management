module Employees
  # Generates realistic, deterministic employees and bulk-inserts them.
  # insert_all skips callbacks and validations, so every derived value (currency) is set here.
  class Seeder
    BATCH_SIZE = 1_000

    # Annual gross pay for a mid-level (L3) employee, in local currency.
    L3_SALARY = {
      "AU" => 120_000, "CA" => 110_000, "DE" => 75_000, "FR" => 65_000,
      "GB" => 65_000, "IN" => 2_000_000, "SG" => 100_000, "US" => 130_000
    }.freeze
    LEVEL_MULTIPLIER = { "L1" => 0.6, "L2" => 0.8, "L3" => 1.0, "L4" => 1.3, "L5" => 1.7, "L6" => 2.2 }.freeze
    # Relative pay by role, so "pay by job title" shows real differences.
    TITLE_FACTOR = {
      "Software Engineer" => 1.15, "DevOps Engineer" => 1.1, "QA Engineer" => 0.9,
      "Product Manager" => 1.15, "Product Designer" => 1.0,
      "Account Executive" => 0.95, "Sales Manager" => 1.1,
      "Financial Analyst" => 0.95, "Accountant" => 0.85,
      "HR Generalist" => 0.8, "Recruiter" => 0.8,
      "Operations Analyst" => 0.85, "Support Specialist" => 0.7
    }.freeze

    COUNTRY_WEIGHTS = { "US" => 30, "IN" => 25, "GB" => 12, "DE" => 8, "CA" => 8, "FR" => 6, "AU" => 6, "SG" => 5 }.freeze
    LEVEL_WEIGHTS = { "L1" => 15, "L2" => 25, "L3" => 25, "L4" => 18, "L5" => 12, "L6" => 5 }.freeze
    JOB_TITLES = {
      "Engineering" => [ "Software Engineer", "QA Engineer", "DevOps Engineer" ],
      "Product" => [ "Product Manager", "Product Designer" ],
      "Sales" => [ "Account Executive", "Sales Manager" ],
      "Finance" => [ "Financial Analyst", "Accountant" ],
      "People" => [ "HR Generalist", "Recruiter" ],
      "Operations" => [ "Operations Analyst", "Support Specialist" ]
    }.freeze
    FIRST_HIRE_DATE = Date.new(2012, 1, 1)
    HIRE_DATE_SPAN_DAYS = (Date.new(2025, 12, 31) - FIRST_HIRE_DATE).to_i + 1 # precomputed: Range#count walks every day

    def initialize(count:, first_names:, last_names:, random_seed: 42)
      @count = count
      @first_names = first_names
      @last_names = last_names
      @random = Random.new(random_seed)
    end

    # One transaction: a failed run leaves no partial table, so seeds.rb can simply retry.
    def call
      Employee.transaction do
        (1..@count).each_slice(BATCH_SIZE) { |numbers| Employee.insert_all!(numbers.map { build(it) }) }
      end
    end

    private

    def build(number)
      first = @first_names.sample(random: @random)
      last = @last_names.sample(random: @random)
      country = weighted(COUNTRY_WEIGHTS)
      level = weighted(LEVEL_WEIGHTS)
      department = JOB_TITLES.keys.sample(random: @random)
      job_title = JOB_TITLES[department].sample(random: @random)

      {
        full_name: "#{first} #{last}",
        email: "#{ascii(first)}.#{ascii(last)}.#{number}@acme.test",
        job_title:,
        department:,
        level:,
        country:,
        currency: Employee::CURRENCY_BY_COUNTRY.fetch(country),
        salary: salary(country, level, job_title),
        hire_date: FIRST_HIRE_DATE + @random.rand(HIRE_DATE_SPAN_DAYS)
      }
    end

    # L3 pay × level × job title × ±15% spread, rounded to whole units.
    def salary(country, level, job_title)
      base = L3_SALARY.fetch(country) * LEVEL_MULTIPLIER.fetch(level) * TITLE_FACTOR.fetch(job_title)
      (base * @random.rand(0.85..1.15)).round
    end

    # Picks a key with probability weight / total.
    def weighted(weights)
      ticket = @random.rand(weights.values.sum)
      weights.find { |_value, weight| (ticket -= weight).negative? }.first
    end

    def ascii(name) = I18n.transliterate(name).downcase.delete("^a-z")
  end
end
