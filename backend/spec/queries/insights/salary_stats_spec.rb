require "rails_helper"

RSpec.describe Insights::SalaryStats do
  def employee(country:, salary:, job_title: "Analyst", department: "Finance")
    create(:employee, country:, salary:, job_title:, department:)
  end

  def stats(**options) = described_class.new(**options).call.index_by { it[:group] }

  describe "by country, in each country's own currency" do
    it "computes headcount, min, max, average and the middle value for an odd count" do
      [ 100, 300, 200 ].each { employee(country: "US", salary: it) }

      expect(stats(group: :country)["US"]).to eq(
        group: "US", currency: "USD", headcount: 3,
        min: BigDecimal("100"), median: BigDecimal("200"), avg: BigDecimal("200"), max: BigDecimal("300"),
        median_usd: BigDecimal("200")
      )
    end

    it "averages the two middle values for an even count" do
      [ 100, 200, 400, 1000 ].each { employee(country: "US", salary: it) }

      expect(stats(group: :country)["US"][:median]).to eq(BigDecimal("300"))
    end

    it "handles a single employee" do
      employee(country: "GB", salary: "55000.50")

      expect(stats(group: :country)["GB"]).to include(headcount: 1, min: BigDecimal("55000.50"), median: BigDecimal("55000.50"))
    end

    it "keeps each country in its own currency, with the median also in USD" do
      employee(country: "US", salary: 100)
      employee(country: "IN", salary: 1_000_000)

      expect(stats(group: :country)["IN"]).to include(currency: "INR", median: BigDecimal("1000000"), median_usd: BigDecimal("12000"))
    end

    it "converts the unrounded median to USD, then rounds once" do
      employee(country: "GB", salary: "100.01")
      employee(country: "GB", salary: "100.02") # median 100.015 GBP × 1.27 = 127.01905

      expect(stats(group: :country)["GB"][:median_usd]).to eq(BigDecimal("127.02"))
    end

    it "rounds averages to two decimals" do
      [ 100, 100, 101 ].each { employee(country: "US", salary: it) }

      expect(stats(group: :country)["US"][:avg]).to eq(BigDecimal("100.33"))
    end

    it "returns nothing when there are no employees" do
      expect(described_class.new(group: :country).call).to eq([])
    end
  end

  describe "by job title or department" do
    it "uses the country's currency when limited to one country" do
      employee(country: "IN", salary: 1_000_000)
      employee(country: "US", salary: 50_000)

      expect(stats(group: :job_title, country: "in")["Analyst"]).to include(currency: "INR", headcount: 1, median: BigDecimal("1000000"))
    end

    it "converts each salary to USD before aggregating across countries" do
      employee(country: "IN", salary: 1_000_000) # 12,000 USD
      employee(country: "US", salary: 20_000)

      expect(stats(group: :job_title)["Analyst"])
        .to include(currency: "USD", headcount: 2, min: BigDecimal("12000"), median: BigDecimal("16000"), max: BigDecimal("20000"))
    end

    it "groups by department for headcount per department" do
      employee(country: "US", salary: 1, department: "Finance")
      employee(country: "US", salary: 2, department: "Finance")
      employee(country: "US", salary: 3, department: "People")

      expect(stats(group: :department).transform_values { it[:headcount] }).to eq("Finance" => 2, "People" => 1)
    end
  end

  describe "invalid options" do
    it "rejects a grouping that is not allowed" do
      expect { described_class.new(group: "salary; DROP TABLE employees") }
        .to raise_error(described_class::InvalidOption) { expect(it.field).to eq(:group) }
    end

    it "rejects an unsupported country" do
      expect { described_class.new(group: :job_title, country: "XX") }
        .to raise_error(described_class::InvalidOption) { expect(it.field).to eq(:country) }
    end
  end

  it "has a USD rate for every currency an employee can have" do
    expect(Employee::CURRENCY_BY_COUNTRY.values.uniq - described_class::USD_PER_UNIT.keys).to be_empty
  end
end
