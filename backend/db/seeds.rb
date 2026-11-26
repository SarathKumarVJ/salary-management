# Idempotent: safe to run again. Never overwrites existing employees or users.
#   bin/rails db:seed
# Outside development/test (production, staging, ...), HR_MANAGER_EMAIL and HR_MANAGER_PASSWORD
# (min 12 chars) are required, so a deploy can never get the well-known dev login.

hr_email, hr_password =
  if Rails.env.local?
    [ ENV.fetch("HR_MANAGER_EMAIL", "hr@acme.test"), ENV.fetch("HR_MANAGER_PASSWORD", "local-dev-password") ]
  else
    [ ENV.fetch("HR_MANAGER_EMAIL"), ENV.fetch("HR_MANAGER_PASSWORD") ]
  end

# Creates the user only if missing; an existing user keeps its password (changing the env var won't reset it).
User.create_with(password: hr_password, role: "hr_manager").find_or_create_by!(email: hr_email)
puts "HR Manager: ready" # not the email: seed output ends up in deploy logs

if Employee.exists?
  puts "Employees: #{Employee.count} already present, skipping."
else
  first_names, last_names = %w[first_names last_names].map do |file|
    Rails.root.join("db/seeds/#{file}.txt").readlines(chomp: true).compact_blank
  end
  started = Process.clock_gettime(Process::CLOCK_MONOTONIC)

  Employees::Seeder.new(count: 10_000, first_names:, last_names:).call

  elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - started
  puts format("Employees: inserted %<count>d in %<seconds>.2fs", count: Employee.count, seconds: elapsed)
end
