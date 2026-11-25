module Api
  module V1
    class EmployeesController < BaseController
      FIELDS = %i[id full_name email job_title department level country currency salary hire_date].freeze

      before_action :set_employee, only: %i[show update destroy]

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

      # currency is derived from country, so it is deliberately not permitted.
      def employee_params
        params.expect(employee: %i[full_name email job_title department level country salary hire_date])
      end

      # Explicit fields (no timestamps). Salary is a decimal string with exactly two places, e.g.
      # "1500000.00": exact for money, unlike a JSON number.
      def employee_json(employee)
        employee.as_json(only: FIELDS).merge("salary" => ActiveSupport::NumberHelper.number_to_rounded(employee.salary, precision: 2))
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
