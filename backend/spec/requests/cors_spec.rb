require "rails_helper"

RSpec.describe "CORS", type: :request do
  let(:allowed_origin) { "http://localhost:5173" }

  it "allows the configured frontend origin to call the API" do
    options "/api/v1/employees", headers: {
      "Origin" => allowed_origin,
      "Access-Control-Request-Method" => "GET"
    }

    expect(response.headers["Access-Control-Allow-Origin"]).to eq(allowed_origin)
  end

  it "does not allow other origins" do
    options "/api/v1/employees", headers: {
      "Origin" => "https://evil.example",
      "Access-Control-Request-Method" => "GET"
    }

    expect(response.headers["Access-Control-Allow-Origin"]).to be_nil
  end
end
