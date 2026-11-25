class CreateEmployees < ActiveRecord::Migration[8.1]
  def change
    create_table :employees do |t|
      t.string :full_name, null: false
      t.string :email, null: false
      t.string :job_title, null: false
      t.string :department, null: false
      t.string :level, null: false, limit: 2     # L1–L6, see Employee::LEVELS (no filter in scope, so not indexed)
      t.string :country, null: false, limit: 2   # ISO 3166-1 alpha-2
      t.string :currency, null: false, limit: 3  # ISO 4217, derived from country
      t.decimal :salary, null: false, precision: 12, scale: 2  # annual gross, local currency
      t.date :hire_date, null: false

      t.timestamps
    end

    add_index :employees, :email, unique: true            # one record per person; backs the uniqueness validation
    add_index :employees, :full_name                       # prefix name search
    add_index :employees, :department                      # department filter / headcount
    add_index :employees, :job_title                       # job-title filter / insights
    add_index :employees, [ :country, :job_title ]         # country filter + "job title within a country"
  end
end
