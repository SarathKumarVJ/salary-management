module Api
  module V1
    # Options for the list filters and the employee form, so the SPA never hard-codes them.
    class FiltersController < BaseController
      def show
        # Department / job title pairs in use, grouped ignoring case like MySQL's collation, so "Finance" and
        # "finance" are one department (named by its first spelling). Departments come from these keys, so the
        # dropdown values and the map always match.
        pairs = Employee.distinct.order(:department, :job_title).pluck(:department, :job_title)
        titles_by_department = pairs.group_by { |department, _| department.downcase }.to_h do |_, rows|
          [ rows.first.first, rows.map(&:last).uniq(&:downcase) ]
        end

        render json: {
          countries: Employee::CURRENCY_BY_COUNTRY.keys,
          currencies: Employee::CURRENCY_BY_COUNTRY,
          levels: Employee::LEVELS,
          departments: titles_by_department.keys,
          # Its own query: sorting in Ruby wouldn't match MySQL's case-insensitive order.
          job_titles: Employee.distinct.order(:job_title).pluck(:job_title),
          job_titles_by_department: titles_by_department
        }
      end
    end
  end
end
