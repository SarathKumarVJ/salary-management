require "rails_helper"

RSpec.describe "Api::V1::Employees", type: :request do
  let(:hr_manager) { create(:user) }
  let(:headers) { auth_headers_for(hr_manager) }
  let(:employee) { create(:employee, full_name: "Ana Silva", email: "ana@acme.test", country: "IN", salary: "1500000.00") }

  let(:valid_params) do
    {
      employee: {
        full_name: "Ravi Kumar",
        email: "ravi@acme.test",
        job_title: "Data Analyst",
        department: "Finance",
        level: "L2",
        country: "IN",
        salary: "1200000.50",
        hire_date: "2024-04-01"
      }
    }
  end

  describe "access control" do
    it "is unauthorized without a token" do
      get "/api/v1/employees/#{employee.id}"

      expect(response).to have_http_status(:unauthorized)
    end

    it "is forbidden for a signed-in user without the hr_manager role" do
      get "/api/v1/employees/#{employee.id}", headers: auth_headers_for(create(:user, role: nil))

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Not allowed" ] })
    end
  end

  describe "GET /api/v1/employees/:id" do
    it "returns the employee" do
      get "/api/v1/employees/#{employee.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["employee"]).to eq(
        "id" => employee.id,
        "full_name" => "Ana Silva",
        "email" => "ana@acme.test",
        "job_title" => "Software Engineer",
        "department" => "Engineering",
        "level" => "L3",
        "country" => "IN",
        "currency" => "INR",
        "salary" => "1500000.00",
        "hire_date" => "2022-01-10"
      )
    end

    it "returns 404 for an unknown id" do
      get "/api/v1/employees/0", headers: headers

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Not found" ] })
    end
  end

  describe "POST /api/v1/employees" do
    it "creates an employee with currency derived from country" do
      expect { post "/api/v1/employees", params: valid_params, headers:, as: :json }
        .to change(Employee, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["employee"]).to include("email" => "ravi@acme.test", "currency" => "INR")
    end

    it "never stores a client-sent currency that contradicts the country" do
      post "/api/v1/employees", params: valid_params.deep_merge(employee: { currency: "USD" }), headers:, as: :json

      expect(response.parsed_body["employee"]["currency"]).to eq("INR")
    end

    it "returns field errors for invalid input" do
      post "/api/v1/employees", params: { employee: { email: "bad" } }, headers:, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]).to include(
        "full_name" => [ "can't be blank" ],
        "email" => [ "is invalid" ]
      )
    end

    it "returns 400 in the standard error shape when the employee key is missing" do
      post "/api/v1/employees", params: { name: "x" }, headers:, as: :json

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Missing or invalid parameters" ] })
    end

    it "returns 400 in the standard error shape for malformed JSON" do
      post "/api/v1/employees", params: "{not json", headers: headers.merge("Content-Type" => "application/json")

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Missing or invalid parameters" ] })
    end

    # Simulates losing a race: validation passed, then the unique index rejected the insert.
    it "returns 422 when the unique email index rejects a concurrent duplicate" do
      allow_any_instance_of(Employee).to receive(:save).and_raise(ActiveRecord::RecordNotUnique)

      post "/api/v1/employees", params: valid_params, headers:, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body).to eq("errors" => { "email" => [ "has already been taken" ] })
    end
  end

  describe "PATCH /api/v1/employees/:id" do
    it "updates the employee, and currency follows a new country" do
      patch "/api/v1/employees/#{employee.id}", params: { employee: { country: "GB", salary: "70000" } },
                                                 headers:, as: :json

      expect(response).to have_http_status(:ok)
      expect(employee.reload).to have_attributes(country: "GB", currency: "GBP", salary: BigDecimal("70000"))
    end

    it "returns field errors for invalid input" do
      patch "/api/v1/employees/#{employee.id}", params: { employee: { salary: "-1" } }, headers:, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]).to eq("salary" => [ "must be greater than 0" ])
    end

    it "returns 404 for an unknown id" do
      patch "/api/v1/employees/0", params: { employee: { salary: "1" } }, headers:, as: :json

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Not found" ] })
    end
  end

  describe "DELETE /api/v1/employees/:id" do
    it "deletes the employee" do
      delete "/api/v1/employees/#{employee.id}", headers: headers

      expect(response).to have_http_status(:no_content)
      expect(Employee.exists?(employee.id)).to be(false)
    end

    it "returns 404 for an unknown id" do
      delete "/api/v1/employees/0", headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end
end
