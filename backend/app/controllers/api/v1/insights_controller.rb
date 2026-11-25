module Api
  module V1
    # "How do we pay people?": salary statistics grouped by country, job title or department.
    # See Insights::SalaryStats for how currencies are kept apart.
    class InsightsController < BaseController
      rescue_from Insights::SalaryStats::InvalidOption do |error|
        render json: { errors: { error.field => [ "is not supported" ] } }, status: :bad_request
      end

      def show
        rows = Insights::SalaryStats.new(group: params[:group], country: params[:country]).call
        render json: {
          group: params[:group],
          rates_as_of: Insights::SalaryStats::RATES_AS_OF,
          rows: rows.map { row_json(it) }
        }
      end

      private

      def row_json(stats)
        { name: stats[:group], currency: stats[:currency], headcount: stats[:headcount],
          **stats.slice(:min, :median, :avg, :max, :median_usd).transform_values { money(it) } }
      end

      def money(amount) = ActiveSupport::NumberHelper.number_to_rounded(amount, precision: 2)
    end
  end
end
