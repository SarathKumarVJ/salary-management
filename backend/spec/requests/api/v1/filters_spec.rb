require "rails_helper"

RSpec.describe "GET /api/v1/filters", type: :request do
  it "returns supported countries and levels plus departments and job titles in use" do
    create(:employee, department: "Finance", job_title: "Analyst")
    create(:employee, department: "Engineering", job_title: "Analyst")

    get "/api/v1/filters", headers: auth_headers_for(create(:user))

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq(
      "countries" => Employee::CURRENCY_BY_COUNTRY.keys,
      "levels" => Employee::LEVELS,
      "departments" => [ "Engineering", "Finance" ],
      "job_titles" => [ "Analyst" ]
    )
  end

  it "is forbidden without the hr_manager role" do
    get "/api/v1/filters", headers: auth_headers_for(create(:user, role: nil))

    expect(response).to have_http_status(:forbidden)
  end

  it "is unauthorized without a token" do
    get "/api/v1/filters"

    expect(response).to have_http_status(:unauthorized)
  end
end
