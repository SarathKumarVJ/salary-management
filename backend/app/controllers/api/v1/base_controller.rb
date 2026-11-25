module Api
  module V1
    # Every API endpoint requires a valid, unexpired session and the hr_manager role unless it opts out.
    class BaseController < ApplicationController
      include ActionController::HttpAuthentication::Token::ControllerMethods

      before_action :authenticate!
      before_action :require_hr_manager!

      rescue_from ActiveRecord::RecordNotFound do
        render json: { errors: { base: [ "Not found" ] } }, status: :not_found
      end

      rescue_from ActionController::ParameterMissing, ActionDispatch::Http::Parameters::ParseError do
        render json: { errors: { base: [ "Missing or invalid parameters" ] } }, status: :bad_request
      end

      private

      attr_reader :current_session

      def current_user = current_session.user

      def authenticate!
        @current_session = authenticate_with_http_token { |token, _options| Session.active.find_by(token:) }
        render json: { errors: { base: [ "Not signed in" ] } }, status: :unauthorized unless current_session
      end

      def require_hr_manager!
        render json: { errors: { base: [ "Not allowed" ] } }, status: :forbidden unless current_user.hr_manager?
      end
    end
  end
end
