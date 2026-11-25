require "rails_helper"

RSpec.describe Employees::SearchQuery do
  let!(:ana)   { create(:employee, full_name: "Ana Silva",   email: "ana@acme.test",   country: "IN", department: "Engineering", job_title: "Software Engineer", salary: 300, hire_date: Date.new(2020, 1, 1)) }
  let!(:bruno) { create(:employee, full_name: "Bruno Costa", email: "bruno@acme.test", country: "US", department: "Finance",     job_title: "Analyst",           salary: 100, hire_date: Date.new(2022, 1, 1)) }
  let!(:carla) { create(:employee, full_name: "Carla Silva", email: "carla@acme.test", country: "US", department: "Engineering", job_title: "Software Engineer", salary: 200, hire_date: Date.new(2021, 1, 1)) }

  def search(params = {}) = described_class.new(params).call

  it "returns everyone sorted by name by default" do
    expect(search).to eq([ ana, bruno, carla ])
  end

  describe "search" do
    it "matches any part of the name, ignoring case" do
      expect(search(q: "silva")).to contain_exactly(ana, carla)
    end

    it "matches the email" do
      expect(search(q: "bruno@")).to eq([ bruno ])
    end

    it "treats LIKE wildcards in the term literally" do
      expect(search(q: "%")).to be_empty
    end

    it "ignores a blank term" do
      expect(search(q: "  ")).to eq([ ana, bruno, carla ])
    end
  end

  describe "filters" do
    it "filters by country" do
      expect(search(country: "US")).to contain_exactly(bruno, carla)
    end

    it "filters by department" do
      expect(search(department: "Finance")).to eq([ bruno ])
    end

    it "filters by job title" do
      expect(search(job_title: "Software Engineer")).to contain_exactly(ana, carla)
    end

    it "combines filters and search" do
      expect(search(country: "US", department: "Engineering", q: "silva")).to eq([ carla ])
    end
  end

  describe "sorting" do
    it "sorts by salary descending" do
      expect(search(sort: "salary", dir: "desc")).to eq([ ana, carla, bruno ])
    end

    it "sorts by hire date ascending" do
      expect(search(sort: "hire_date")).to eq([ ana, carla, bruno ])
    end

    it "falls back to name for a column that is not allowed" do
      expect(search(sort: "email; DROP TABLE employees", dir: "sideways")).to eq([ ana, bruno, carla ])
    end

    it "breaks ties by id so pages are stable" do
      twin = create(:employee, full_name: "Ana Silva", email: "ana2@acme.test")

      expect(search.first(2)).to eq([ ana, twin ])
    end
  end
end
