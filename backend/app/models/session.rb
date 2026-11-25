# A sign-in. The token is sent as "Authorization: Bearer <token>"; deleting the row signs out.
class Session < ApplicationRecord
  TTL = 12.hours

  belongs_to :user
  has_secure_token :token

  before_create { self.expires_at = TTL.from_now }

  scope :active, -> { where("expires_at > ?", Time.current) }
end
