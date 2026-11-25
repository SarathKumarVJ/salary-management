# Allow the deployed React frontend to call the JSON API from another origin.
# See lib/cors_origins.rb for how CORS_ORIGINS is read.
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins CorsOrigins.from_env

    resource "/api/*",
      headers: :any,
      methods: %i[get post put patch delete options head]
  end
end
