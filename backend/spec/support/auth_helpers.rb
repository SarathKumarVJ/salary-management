# Signs a user in without going through the sign-in endpoint.
module AuthHelpers
  def auth_headers_for(user)
    { "Authorization" => "Bearer #{user.sessions.create!.token}" }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
