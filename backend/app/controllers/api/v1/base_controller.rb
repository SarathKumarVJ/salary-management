module Api
  module V1
    # Every API endpoint requires a valid, unexpired session unless it opts out.
    class BaseController < ApplicationController
      include ActionController::HttpAuthentication::Token::ControllerMethods

      before_action :authenticate!

      private

      attr_reader :current_session

      def current_user = current_session.user

      def authenticate!
        @current_session = authenticate_with_http_token { |token, _options| Session.active.find_by(token:) }
        render json: { errors: { base: [ "Not signed in" ] } }, status: :unauthorized unless current_session
      end
    end
  end
end
