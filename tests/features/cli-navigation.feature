Feature: CLI Navigation and Help
  As a user I can navigate and get help from the CLI so that I can discover and use commands.

  Scenario: Show main help
    Given I am on the Terminal page
    When I run the command "help"
    Then I should see "help" in the output
    And I should see "contact" in the output
    And I should see "persona" in the output

  Scenario: Clear terminal output
    Given I am on the Terminal page
    And I run the command "contact list"
    When I run the command "clear"
    Then the terminal output should be cleared
