require "rails_helper"

RSpec.describe Employee, type: :model do
  subject(:employee) { build(:employee) }

  it "has a valid factory" do
    expect(employee).to be_valid
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:full_name) }
    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_presence_of(:job_title) }
    it { is_expected.to validate_presence_of(:department) }
    it { is_expected.to validate_presence_of(:hire_date) }
    it { is_expected.to validate_inclusion_of(:level).in_array(Employee::LEVELS) }
    it { is_expected.to validate_inclusion_of(:country).in_array(Employee::CURRENCY_BY_COUNTRY.keys) }

    it do
      is_expected.to validate_numericality_of(:salary)
        .is_greater_than(0)
        .is_less_than(Employee::MAX_SALARY)
    end

    it { is_expected.to validate_length_of(:full_name).is_at_most(255) }
    it { is_expected.to validate_length_of(:job_title).is_at_most(255) }
    it { is_expected.to validate_length_of(:department).is_at_most(255) }
    it { is_expected.to validate_length_of(:email).is_at_most(254) }

    it "accepts a well-formed email" do
      employee.email = "ana.silva@acme.test"

      expect(employee).to be_valid
    end

    it "rejects a malformed email" do
      employee.email = "not-an-email"

      expect(employee).not_to be_valid
      expect(employee.errors[:email]).to include("is invalid")
    end

    it "rejects an email already used by another employee, ignoring case" do
      create(:employee, email: "ana.silva@acme.test")
      employee.email = "Ana.Silva@ACME.test"

      expect(employee).not_to be_valid
      expect(employee.errors[:email]).to include("has already been taken")
    end

    # Dates are checked against UTC with one day of tolerance, so "today" is valid
    # for HR in any time zone (e.g. India is UTC+5:30).
    it "accepts tomorrow's date (UTC), which is already today east of UTC" do
      travel_to Time.utc(2026, 6, 1, 20, 0) do
        employee.hire_date = Date.new(2026, 6, 2)

        expect(employee).to be_valid
      end
    end

    it "rejects a hire date more than one day ahead of UTC" do
      travel_to Time.utc(2026, 6, 1, 20, 0) do
        employee.hire_date = Date.new(2026, 6, 3)

        expect(employee).not_to be_valid
        expect(employee.errors[:hire_date]).to include("can't be in the future")
      end
    end

    it "accepts a hire date of today" do
      travel_to Date.new(2026, 6, 1) do
        employee.hire_date = Date.new(2026, 6, 1)

        expect(employee).to be_valid
      end
    end
  end

  describe "normalisation" do
    it "stores the email stripped and lower-cased" do
      employee.email = "  Ana.Silva@ACME.test "

      expect(employee.email).to eq("ana.silva@acme.test")
    end

    it "stores the country code upper-cased" do
      employee.country = "in"

      expect(employee.country).to eq("IN")
    end
  end

  describe "currency" do
    it "is derived from the country" do
      employee.country = "IN"
      employee.validate

      expect(employee.currency).to eq("INR")
    end

    it "cannot be saved with a currency that contradicts the country" do
      employee.country = "IN"
      employee.currency = "USD"
      employee.save!

      expect(employee.reload.currency).to eq("INR")
    end

    it "follows the country when the country changes" do
      saved = create(:employee, country: "US")

      saved.update!(country: "GB")

      expect(saved.reload.currency).to eq("GBP")
    end
  end

  describe "salary" do
    it "is stored as an exact decimal with two places" do
      saved = create(:employee, salary: "85000.555")

      expect(saved.reload.salary).to be_a(BigDecimal)
      expect(saved.salary).to eq(BigDecimal("85000.56"))
    end
  end
end
