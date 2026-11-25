require "rails_helper"

RSpec.describe Employees::Seeder do
  let(:first_names) { %w[Ana José Zoë Ravi] }
  let(:last_names)  { %w[Silva Müller Kumar] }

  def seed(count: 50, random_seed: 42)
    described_class.new(count:, random_seed:, first_names:, last_names:).call
  end

  it "inserts the requested number of employees" do
    expect { seed(count: 50) }.to change(Employee, :count).by(50)
  end

  it "produces rows that pass every model validation" do
    seed

    expect(Employee.all.reject(&:valid?)).to be_empty
  end

  it "sets each currency from its country, since insert_all skips the model callback" do
    seed

    mismatched = Employee.all.reject { it.currency == Employee::CURRENCY_BY_COUNTRY.fetch(it.country) }
    expect(mismatched).to be_empty
  end

  it "builds unique ASCII emails from the names" do
    seed

    expect(Employee.pluck(:email)).to all(match(/\A[a-z]+\.[a-z]+\.\d+@acme\.test\z/))
    expect(Employee.distinct.count(:email)).to eq(50)
  end

  it "is deterministic for the same random seed" do
    seed
    columns = %i[email full_name job_title department country level salary hire_date]
    first_run = Employee.order(:email).pluck(*columns)
    Employee.delete_all

    seed

    expect(Employee.order(:email).pluck(*columns)).to eq(first_run)
  end

  # Rough middle value (upper median) is enough to compare groups here.
  def middle_salary(rows) = rows.map(&:salary).sort[rows.size / 2]

  it "pays higher levels more within a country" do
    seed(count: 400)

    by_level = Employee.where(country: "US").group_by(&:level).transform_values { middle_salary(it) }
    expect(by_level.fetch("L5")).to be > by_level.fetch("L1")
  end

  it "pays some job titles more than others, so insights by title are meaningful" do
    seed(count: 2_000)

    by_title = Employee.where(country: "US").group_by(&:job_title).transform_values { middle_salary(it) }
    expect(by_title.fetch("Software Engineer")).to be > by_title.fetch("Support Specialist") * 1.3
  end

  it "inserts all batches or none, so a failed run can be retried" do
    stub_const("#{described_class}::BATCH_SIZE", 10)
    calls = 0
    allow(Employee).to receive(:insert_all!).and_wrap_original do |original, rows|
      raise ActiveRecord::StatementInvalid, "boom" if (calls += 1) == 2

      original.call(rows)
    end

    expect { seed(count: 20) }.to raise_error(ActiveRecord::StatementInvalid)
    expect(Employee.count).to eq(0)
  end
end
