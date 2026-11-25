require "rails_helper"

RSpec.describe CorsOrigins do
  describe ".from_env" do
    it "defaults to the Vite dev server outside production" do
      expect(described_class.from_env({}, production: false)).to eq([ "http://localhost:5173" ])
    end

    it "splits a comma-separated list, trimming spaces and dropping blank entries" do
      env = { "CORS_ORIGINS" => "https://a.example, ,https://b.example," }

      expect(described_class.from_env(env, production: false))
        .to eq([ "https://a.example", "https://b.example" ])
    end

    it "fails fast in production when CORS_ORIGINS is missing" do
      expect { described_class.from_env({}, production: true) }
        .to raise_error(KeyError, /CORS_ORIGINS/)
    end

    it "fails fast in production when CORS_ORIGINS is blank" do
      expect { described_class.from_env({ "CORS_ORIGINS" => " " }, production: true) }
        .to raise_error(KeyError, /CORS_ORIGINS/)
    end
  end
end
