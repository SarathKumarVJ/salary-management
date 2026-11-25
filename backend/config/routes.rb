Rails.application.routes.draw do
  # Health check for load balancers and uptime monitors (200 if the app boots).
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resource :session, only: %i[create show destroy]
      resources :employees, only: %i[show create update destroy]
    end
  end
end
