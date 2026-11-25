class Employee < ApplicationRecord
  # Supported countries and their single currency. Currency is derived, never entered,
  # so a row can't say "India / USD" and corrupt per-country aggregates.
  CURRENCY_BY_COUNTRY = {
    "AU" => "AUD",
    "CA" => "CAD",
    "DE" => "EUR",
    "FR" => "EUR",
    "GB" => "GBP",
    "IN" => "INR",
    "SG" => "SGD",
    "US" => "USD"
  }.freeze

  LEVELS = %w[L1 L2 L3 L4 L5 L6].freeze

  # Upper bound of the decimal(12, 2) column.
  MAX_SALARY = 10**10

  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :country, with: ->(country) { country.strip.upcase }

  before_validation :assign_currency_from_country

  validates :full_name, :job_title, :department, presence: true, length: { maximum: 255 }
  validates :email, presence: true, length: { maximum: 254 }, uniqueness: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :hire_date, presence: true
  validates :level, inclusion: { in: LEVELS }
  validates :country, inclusion: { in: CURRENCY_BY_COUNTRY.keys }
  validates :salary, numericality: { greater_than: 0, less_than: MAX_SALARY }
  validate :hire_date_not_in_future

  private

  def assign_currency_from_country
    self.currency = CURRENCY_BY_COUNTRY[country]
  end

  # Compared with the UTC date plus one day, so today's date is accepted in every
  # time zone (HR may be ahead of UTC, e.g. India) without configuring one.
  def hire_date_not_in_future
    errors.add(:hire_date, "can't be in the future") if hire_date && hire_date > Date.current + 1
  end
end
