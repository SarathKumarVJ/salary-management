class CreateUsersAndSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :role                      # "hr_manager"; nil = no access
      t.timestamps
    end
    add_index :users, :email, unique: true  # sign-in lookup + one account per email

    create_table :sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token, null: false, collation: "utf8mb4_bin"  # case-sensitive match (table default is _ci)
      t.datetime :expires_at, null: false
      t.timestamps
    end
    add_index :sessions, :token, unique: true  # every authenticated request looks up by token
  end
end
