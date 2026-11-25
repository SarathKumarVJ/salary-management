module Api
  module V1
    class EmployeesController < BaseController
      include Pagy::Method

      FIELDS = %i[id full_name email job_title department level country currency salary hire_date].freeze
      CSV_FIELDS = (FIELDS - %i[id]).freeze
      SALARY_COLUMN = CSV_FIELDS.index(:salary)
      TEXT_COLUMNS = %i[full_name email job_title department].map { CSV_FIELDS.index(it) }.freeze
      UTF8_BOM = "\uFEFF".freeze # lets Excel open accented names (José, Zoë) as UTF-8

      before_action :set_employee, only: %i[show update destroy]

      # JSON: one page. CSV (/employees.csv): every employee matching the same search and filters.
      def index
        employees = Employees::SearchQuery.new(search_params).call
        return send_csv(employees) if request.format.csv?

        pagy, page = pagy(:offset, employees, limit: 25, client_limit: 100)
        render json: {
          employees: page.map { employee_json(it) },
          meta: { page: pagy.page, limit: pagy.limit, count: pagy.count, pages: pagy.pages }
        }
      end

      def show
        render json: { employee: employee_json(@employee) }
      end

      def create
        employee = Employee.new(employee_params)
        save_and_render(employee, :created)
      end

      def update
        @employee.assign_attributes(employee_params)
        save_and_render(@employee, :ok)
      end

      def destroy
        @employee.destroy!
        head :no_content
      end

      private

      def set_employee
        @employee = Employee.find(params[:id])
      end

      def search_params = params.permit(:q, :country, :department, :job_title, :sort, :dir)

      # currency is derived from country, so it is deliberately not permitted.
      def employee_params
        params.expect(employee: %i[full_name email job_title department level country salary hire_date])
      end

      # Explicit fields (no timestamps). Salary is a decimal string with exactly two places, e.g.
      # "1500000.00": exact for money, unlike a JSON number.
      def employee_json(employee)
        employee.as_json(only: FIELDS).merge("salary" => money(employee.salary))
      end

      def money(amount) = ActiveSupport::NumberHelper.number_to_rounded(amount, precision: 2)

      # pluck keeps the search order and avoids building ~10k Employee objects.
      def send_csv(employees)
        csv = CSV.generate(UTF8_BOM.dup) do |rows|
          rows << CSV_FIELDS
          employees.pluck(*CSV_FIELDS).each do |row|
            row[SALARY_COLUMN] = money(row[SALARY_COLUMN])
            TEXT_COLUMNS.each { row[it] = escape_formula(row[it]) }
            rows << row
          end
        end
        send_data csv, type: "text/csv; charset=utf-8", filename: "employees.csv"
      end

      # Spreadsheet apps run cells starting with these characters as formulas (CSV injection).
      def escape_formula(value)
        value.start_with?("=", "+", "-", "@", "\t", "\r") ? "'#{value}" : value
      end

      def save_and_render(employee, status)
        if employee.save
          render json: { employee: employee_json(employee) }, status:
        else
          render json: { errors: employee.errors }, status: :unprocessable_content
        end
      rescue ActiveRecord::RecordNotUnique
        # Two requests passed the uniqueness validation at once; the unique index caught the second.
        render json: { errors: { email: [ "has already been taken" ] } }, status: :unprocessable_content
      end
    end
  end
end
