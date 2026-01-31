Feature: CLI Navigation and Help
  As a user I can navigate and get help from the CLI so that I can discover and use commands.

  Scenario Outline: Show main help
    Given I have the CLI in the <context>
    When I run the command "help"
    Then I should see "help" in the output
    And I should see "contact" in the output
    And I should see "persona" in the output
    Examples:
      | context  |
      | browser  |
      | terminal |

  Scenario Outline: Clear terminal output
    Given I have the CLI in the <context>
    And I run the command "contact list"
    When I run the command "clear"
    Then the terminal output should be cleared
    Examples:
      | context  |
      | browser  |
      | terminal |
