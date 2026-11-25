module Insights
  # Salary statistics per group in a single SQL pass. MySQL 8 has no PERCENTILE_CONT, so the exact
  # median comes from window functions: number the rows within each group by salary and average the
  # middle row (odd count) or the two middle rows (even count).
  #
  # Currencies are never mixed:
  # - by country: each country in its own currency (one currency per country);
  # - by job title / department within one country: that country's currency;
  # - by job title / department across countries: every salary converted to USD *before* aggregating.
  class SalaryStats
    class InvalidOption < ArgumentError
      attr_reader :field

      def initialize(field)
        @field = field
        super("unsupported #{field}")
      end
    end

    GROUPS = { "country" => "country", "job_title" => "job_title", "department" => "department" }.freeze

    # Fixed, illustrative rates (USD per unit), not live market data: the figures stay stable and
    # comparable. Shown to users with this date.
    RATES_AS_OF = "2026-11-01".freeze
    USD_PER_UNIT = {
      "USD" => "1", "EUR" => "1.08", "GBP" => "1.27", "INR" => "0.012",
      "CAD" => "0.73", "AUD" => "0.66", "SGD" => "0.74"
    }.transform_values { BigDecimal(it) }.freeze

    def initialize(group:, country: nil)
      @column = GROUPS.fetch(group.to_s) { raise InvalidOption, :group }
      @country = country.presence&.strip&.upcase
      raise InvalidOption, :country if @country && !Employee::CURRENCY_BY_COUNTRY.key?(@country)
    end

    def call
      Employee.connection.select_all(sql).map do |row|
        median = BigDecimal(row["median"].to_s)
        currency = currency_for(row["grp"])
        {
          group: row["grp"],
          currency:,
          headcount: row["headcount"].to_i,
          min: BigDecimal(row["min"].to_s).round(2),
          median: median.round(2),
          avg: BigDecimal(row["avg"].to_s).round(2),
          max: BigDecimal(row["max"].to_s).round(2),
          median_usd: (median * USD_PER_UNIT.fetch(currency)).round(2)
        }
      end
    end

    private

    def by_country? = @column == "country"

    def in_usd? = !by_country? && @country.nil?

    def currency_for(group)
      return Employee::CURRENCY_BY_COUNTRY.fetch(group) if by_country?

      in_usd? ? "USD" : Employee::CURRENCY_BY_COUNTRY.fetch(@country)
    end

    def sql
      <<~SQL
        WITH ranked AS (
          SELECT grp, amount,
                 ROW_NUMBER() OVER (PARTITION BY grp ORDER BY amount) AS position,
                 COUNT(*)     OVER (PARTITION BY grp)                 AS size
          FROM (#{source.to_sql}) AS source
        )
        SELECT grp,
               MAX(size)   AS headcount,
               MIN(amount) AS min,
               AVG(amount) AS avg,
               MAX(amount) AS max,
               AVG(CASE WHEN position IN (FLOOR((size + 1) / 2), CEIL((size + 1) / 2)) THEN amount END) AS median
        FROM ranked
        GROUP BY grp
        ORDER BY grp
      SQL
    end

    # @column comes from GROUPS, never from user input; the country filter is a bound value.
    def source
      scope = @country ? Employee.where(country: @country) : Employee.all
      scope.select("#{@column} AS grp, #{amount_sql} AS amount")
    end

    # CAST keeps the multiplication in exact DECIMAL arithmetic (a quoted rate would make MySQL use DOUBLE).
    def amount_sql
      return "salary" unless in_usd?

      cases = USD_PER_UNIT.map do |currency, rate|
        Employee.sanitize_sql_array([ "WHEN ? THEN CAST(? AS DECIMAL(12, 6))", currency, rate.to_s("F") ])
      end
      "salary * CASE currency #{cases.join(' ')} END"
    end
  end
end
