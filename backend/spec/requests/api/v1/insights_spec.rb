require "rails_helper"

RSpec.describe "GET /api/v1/insights", type: :request do
  let(:headers) { auth_headers_for(create(:user)) }

  def insights(params = {})
    get("/api/v1/insights", params:, headers:)
    response.parsed_body
  end

  context "with employees" do
    before do
      create(:employee, country: "IN", job_title: "Analyst", department: "Finance", salary: 1_000_000)
      create(:employee, country: "IN", job_title: "Engineer", department: "Engineering", salary: 2_000_000)
      create(:employee, country: "US", job_title: "Analyst", department: "Finance", salary: 20_000)
    end

    it "returns per-country stats in local currency with the median in USD" do
      body = insights(group: "country")

      expect(response).to have_http_status(:ok)
      expect(body).to include("group" => "country", "rates_as_of" => Insights::SalaryStats::RATES_AS_OF)
      expect(body["rows"].find { it["name"] == "IN" }).to eq(
        "name" => "IN", "currency" => "INR", "headcount" => 2,
        "min" => "1000000.00", "median" => "1500000.00", "avg" => "1500000.00", "max" => "2000000.00",
        "median_usd" => "18000.00"
      )
    end

    it "returns job-title stats in USD across all countries" do
      analyst = insights(group: "job_title")["rows"].find { it["name"] == "Analyst" }

      expect(analyst).to include("currency" => "USD", "headcount" => 2, "median" => "16000.00")
    end

    it "returns job-title stats in local currency within one country (any case)" do
      rows = insights(group: "job_title", country: "in")["rows"]

      expect(rows.pluck("name", "currency")).to eq([ %w[Analyst INR], %w[Engineer INR] ])
    end

    it "returns headcount by department" do
      rows = insights(group: "department")["rows"]

      expect(rows.to_h { [ it["name"], it["headcount"] ] }).to eq("Engineering" => 1, "Finance" => 2)
    end
  end

  it "returns no rows when there are no employees" do
    expect(insights(group: "country")["rows"]).to eq([])
  end

  it "rejects an unsupported country" do
    insights(group: "job_title", country: "XX")

    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body).to eq("errors" => { "country" => [ "is not supported" ] })
  end

  it "rejects an unsupported grouping" do
    insights(group: "salary")

    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body).to eq("errors" => { "group" => [ "is not supported" ] })
  end

  it "is unauthorized without a token" do
    get "/api/v1/insights", params: { group: "country" }

    expect(response).to have_http_status(:unauthorized)
  end

  it "is forbidden without the hr_manager role" do
    get "/api/v1/insights", params: { group: "country" }, headers: auth_headers_for(create(:user, role: nil))

    expect(response).to have_http_status(:forbidden)
  end
end
