require "rails_helper"

RSpec.describe "GET /api/v1/employees", type: :request do
  let(:headers) { auth_headers_for(create(:user)) }

  it "is unauthorized without a token" do
    get "/api/v1/employees"

    expect(response).to have_http_status(:unauthorized)
  end

  it "is forbidden without the hr_manager role" do
    get "/api/v1/employees", headers: auth_headers_for(create(:user, role: nil))

    expect(response).to have_http_status(:forbidden)
  end

  it "keeps the search term out of the logs (it is often a name or email)" do
    filter = ActiveSupport::ParameterFilter.new(Rails.application.config.filter_parameters)

    expect(filter.filter("q" => "ana@acme.test", "sort" => "salary"))
      .to eq("q" => "[FILTERED]", "sort" => "salary")
  end

  it "returns the first page of 25 with pagination metadata" do
    create_list(:employee, 26)

    get "/api/v1/employees", headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["employees"].size).to eq(25)
    expect(response.parsed_body["meta"]).to eq("page" => 1, "limit" => 25, "count" => 26, "pages" => 2)
  end

  it "returns the requested page and limit" do
    create_list(:employee, 5)

    get "/api/v1/employees", params: { page: 2, limit: 2 }, headers: headers

    expect(response.parsed_body["employees"].size).to eq(2)
    expect(response.parsed_body["meta"]).to include("page" => 2, "limit" => 2, "pages" => 3)
  end

  it "caps the limit at 100" do
    get "/api/v1/employees", params: { limit: 10_000 }, headers: headers

    expect(response.parsed_body["meta"]["limit"]).to eq(100)
  end

  it "returns an empty page past the end" do
    create(:employee)

    get "/api/v1/employees", params: { page: 9 }, headers: headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["employees"]).to eq([])
  end

  it "applies search, filters and sort" do
    create(:employee, full_name: "Ana Silva", country: "IN", salary: 100)
    create(:employee, full_name: "Carla Silva", country: "IN", salary: 200)
    create(:employee, full_name: "Bruno Costa", country: "IN", salary: 300)

    get "/api/v1/employees", params: { q: "silva", country: "IN", sort: "salary", dir: "desc" }, headers: headers

    expect(response.parsed_body["employees"].pluck("full_name")).to eq([ "Carla Silva", "Ana Silva" ])
    expect(response.parsed_body["employees"].first["salary"]).to eq("200.00")
  end

  describe "CSV export" do
    it "downloads every matching employee as CSV, ignoring pagination" do
      create(:employee, full_name: "Ana Silva", email: "ana@acme.test", country: "IN", salary: "1500000.5", hire_date: Date.new(2020, 1, 1))
      create(:employee, full_name: "Bruno Costa", country: "US")

      get "/api/v1/employees.csv", params: { country: "IN", limit: 1, page: 2 }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("text/csv")
      expect(response.headers["Content-Disposition"]).to include('attachment; filename="employees.csv"')
      expect(response.body).to start_with("\uFEFF") # BOM, so Excel reads accented names as UTF-8
      expect(response.body.delete_prefix("\uFEFF").lines.map(&:chomp)).to eq([
        "full_name,email,job_title,department,level,country,currency,salary,hire_date",
        "Ana Silva,ana@acme.test,Software Engineer,Engineering,L3,IN,INR,1500000.50,2020-01-01"
      ])
    end

    it "neutralises spreadsheet formulas in text cells" do
      create(:employee, full_name: "=HYPERLINK(\"http://evil\")", job_title: "+1", department: "@ops")

      get "/api/v1/employees.csv", headers: headers

      row = CSV.parse(response.body.delete_prefix("\uFEFF"), headers: true).first
      expect(row.values_at("full_name", "job_title", "department"))
        .to eq([ "'=HYPERLINK(\"http://evil\")", "'+1", "'@ops" ])
    end
  end
end
