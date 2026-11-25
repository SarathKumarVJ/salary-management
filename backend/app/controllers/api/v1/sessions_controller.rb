module Api
  module V1
    class SessionsController < BaseController
      skip_before_action :authenticate!, only: :create
      # Brute-force guard on the single high-value login (per-process cache store; null store in tests).
      rate_limit to: 10, within: 3.minutes, only: :create

      def create
        # Not params.permit: authenticate_by raises (500) if a key is missing; .to_s turns missing or
        # odd input into a plain 401. Nothing is mass-assigned.
        user = User.authenticate_by(email: params[:email].to_s, password: params[:password].to_s)
        return render json: { errors: { base: [ "Invalid email or password" ] } }, status: :unauthorized unless user

        new_session = user.sessions.create!
        render json: { token: new_session.token, user: user_json(user) }, status: :created
      end

      def show
        render json: { user: user_json(current_user) }
      end

      def destroy
        current_session.destroy!
        head :no_content
      end

      private

      def user_json(user) = user.slice(:email, :role)
    end
  end
end
