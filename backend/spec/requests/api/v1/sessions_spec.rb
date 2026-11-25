require "rails_helper"

RSpec.describe "Api::V1::Sessions", type: :request do
  let!(:user) { create(:user, email: "hr@acme.test", password: "correct-horse-battery") }

  def sign_in(email: "hr@acme.test", password: "correct-horse-battery")
    post "/api/v1/session", params: { email:, password: }, as: :json
  end

  def auth_header(token) = { "Authorization" => "Bearer #{token}" }

  describe "POST /api/v1/session" do
    it "returns a token and the user for valid credentials" do
      sign_in(email: " HR@acme.test ")

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["token"]).to be_present
      expect(response.parsed_body["user"]).to eq("email" => "hr@acme.test", "role" => "hr_manager")
    end

    it "rejects a wrong password with a generic message" do
      sign_in(password: "wrong")

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Invalid email or password" ] })
    end

    it "rejects an unknown email with the same generic message" do
      sign_in(email: "nobody@acme.test")

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Invalid email or password" ] })
    end
  end

  describe "GET /api/v1/session" do
    it "returns the signed-in user" do
      sign_in
      get "/api/v1/session", headers: auth_header(response.parsed_body["token"])

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["user"]["email"]).to eq("hr@acme.test")
    end

    it "is unauthorized without a token" do
      get "/api/v1/session"

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Not signed in" ] })
    end

    it "is unauthorized with an unknown token" do
      get "/api/v1/session", headers: auth_header("made-up")

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).to eq("errors" => { "base" => [ "Not signed in" ] })
    end

    it "treats tokens as case-sensitive" do
      sign_in
      token = response.parsed_body["token"]

      get "/api/v1/session", headers: auth_header(token.swapcase)

      expect(response).to have_http_status(:unauthorized)
    end

    it "is still valid just before the session lifetime ends" do
      sign_in
      token = response.parsed_body["token"]

      travel Session::TTL - 1.second do
        get "/api/v1/session", headers: auth_header(token)
      end

      expect(response).to have_http_status(:ok)
    end

    it "is unauthorized exactly when the session lifetime ends" do
      freeze_time do
        sign_in
        token = response.parsed_body["token"]

        travel Session::TTL
        get "/api/v1/session", headers: auth_header(token)

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/session" do
    it "signs out, after which the token no longer works" do
      sign_in
      token = response.parsed_body["token"]

      delete "/api/v1/session", headers: auth_header(token)
      expect(response).to have_http_status(:no_content)

      get "/api/v1/session", headers: auth_header(token)
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
