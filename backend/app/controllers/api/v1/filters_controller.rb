module Api
  module V1
    # Options for the list filters and the employee form, so the SPA never hard-codes them.
    class FiltersController < BaseController
      def show
        render json: {
          countries: Employee::CURRENCY_BY_COUNTRY.keys,
          currencies: Employee::CURRENCY_BY_COUNTRY,
          levels: Employee::LEVELS,
          departments: Employee.distinct.order(:department).pluck(:department),
          job_titles: Employee.distinct.order(:job_title).pluck(:job_title)
        }
      end
    end
  end
end
