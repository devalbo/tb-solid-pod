Feature: CLI Persona Commands
  As a user I can manage personas via the Terminal so that I can use the CLI for profile operations.

  Scenario Outline: Add a persona via CLI
    Given I have the CLI in the <context>
    When I run the command "persona create TestUser --email=test@example.com"
    Then I should see "Created persona: TestUser" in the output
    Examples:
      | context  |
      | browser  |
      | terminal |

  Scenario Outline: List personas via CLI
    Given I have the CLI in the <context>
    When I run the command "persona list"
    Then I should see "persona" in the output
    Examples:
      | context  |
      | browser  |
      | terminal |

  Scenario Outline: State maintained between commands: add persona then list shows the persona
    Given I have the CLI in the <context>
    And I run the command "persona create TestUser --email=test@example.com"
    When I run the command "persona list"
    Then I should see "TestUser" in the output
    Examples:
      | context  |
      | browser  |
      | terminal |

  Scenario Outline: Show persona help
    Given I have the CLI in the <context>
    When I run the command "persona"
    Then I should see "Usage: persona" in the output
    And I should see "Subcommands" in the output
    And I should see "create" in the output
    Examples:
      | context  |
      | browser  |
      | terminal |
