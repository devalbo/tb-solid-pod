Feature: CLI Persona Commands
  As a user I can manage personas via the Terminal so that I can use the CLI for profile operations.

  Scenario: Add a persona via CLI
    Given I am on the Terminal page
    When I run the command "persona create TestUser --email=test@example.com"
    Then I should see "Created persona: TestUser" in the output

  Scenario: List personas via CLI
    Given I am on the Terminal page
    When I run the command "persona list"
    Then I should see "Persona" in the output

  Scenario: Show persona help
    Given I am on the Terminal page
    When I run the command "persona"
    Then I should see "Usage: persona" in the output
    And I should see "Subcommands" in the output
    And I should see "create" in the output
