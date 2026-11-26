require "rails_helper"

RSpec.describe "GET /api/v1/filters", type: :request do
  it "returns supported countries, currencies and levels plus departments and job titles in use" do
    create(:employee, department: "Finance", job_title: "Analyst")
    create(:employee, department: "Engineering", job_title: "Analyst")

    get "/api/v1/filters", headers: auth_headers_for(create(:user))

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.except("job_titles_by_department")).to eq(
      "countries" => Employee::CURRENCY_BY_COUNTRY.keys,
      "currencies" => Employee::CURRENCY_BY_COUNTRY,
      "levels" => Employee::LEVELS,
      "departments" => [ "Engineering", "Finance" ],
      "job_titles" => [ "Analyst" ]
    )
  end

  it "groups the job titles in use by department, ignoring case like the database does" do
    create(:employee, department: "Finance", job_title: "Analyst")
    create(:employee, department: "finance", job_title: "Clerk")
    create(:employee, department: "Engineering", job_title: "Analyst")
    create(:employee, department: "Engineering", job_title: "Backend Engineer")

    get "/api/v1/filters", headers: auth_headers_for(create(:user))

    expect(response.parsed_body["departments"]).to eq([ "Engineering", "Finance" ])
    expect(response.parsed_body["job_titles_by_department"]).to eq(
      "Engineering" => [ "Analyst", "Backend Engineer" ],
      "Finance" => [ "Analyst", "Clerk" ]
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
