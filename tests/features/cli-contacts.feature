Feature: CLI Contact Commands
  As a user I can manage contacts via the Terminal so that I can use the CLI for quick operations.

  Scenario: Add a new contact via CLI
    Given I am on the Terminal page
    When I run the command "contact add JohnDoe --email=john@example.com"
    Then I should see "Added contact: JohnDoe" in the output

  Scenario: List contacts via CLI
    Given I am on the Terminal page
    And I run the command "contact add JaneSmith"
    When I run the command "contact list"
    Then I should see "JaneSmith" in the output

  Scenario: Show contact help
    Given I am on the Terminal page
    When I run the command "contact"
    Then I should see "Usage: contact" in the output
    And I should see "Subcommands" in the output
    And I should see "add" in the output
    And I should see "list" in the output
