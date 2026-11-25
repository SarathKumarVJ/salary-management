# Origins allowed to call /api/* cross-origin (the deployed frontend).
# In development the SPA goes through the Vite proxy (same origin), so the default
# only matters when the frontend points VITE_API_URL straight at Rails.
module CorsOrigins
  DEV_DEFAULT = "http://localhost:5173".freeze

  # CORS_ORIGINS is a comma-separated list. Production must set it explicitly:
  # silently falling back to localhost would block the real frontend.
  def self.from_env(env = ENV, production: Rails.env.production?)
    raw = env["CORS_ORIGINS"].presence
    raise KeyError, "CORS_ORIGINS must be set in production" if production && raw.nil?

    (raw || DEV_DEFAULT).split(",").map(&:strip).reject(&:empty?)
  end
end
