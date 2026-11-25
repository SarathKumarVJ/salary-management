module Employees
  # Search, filter and sort employees for the list and the CSV export.
  # Pagination is left to the caller.
  class SearchQuery
    SORTABLE = %w[full_name salary hire_date].freeze
    FILTERS = %i[country department job_title].freeze

    def initialize(params)
      @params = params
    end

    def call
      scope = Employee.where(@params.to_h.symbolize_keys.slice(*FILTERS).compact_blank)
      scope = search(scope, @params[:q].to_s.strip)
      scope.order(sort_column => sort_direction, id: :asc)
    end

    private

    # Contains-match on name or email. At ~10k rows a scan is fast; see docs/design.md.
    def search(scope, term)
      return scope if term.empty?

      pattern = "%#{Employee.sanitize_sql_like(term)}%"
      scope.where("full_name LIKE :pattern OR email LIKE :pattern", pattern:)
    end

    def sort_column = SORTABLE.include?(@params[:sort]) ? @params[:sort] : "full_name"

    def sort_direction = @params[:dir] == "desc" ? :desc : :asc
  end
end
