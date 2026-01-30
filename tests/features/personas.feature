Feature: Personas UI
  As a user I can manage personas in the graphical UI so that I can view and edit my profiles.

  Scenario: Open Personas tab
    Given I am on the app home page
    When I click the "Personas" tab
    Then I should see the personas view

  Scenario: App loads with navigation tabs
    Given I am on the app home page
    Then I should see the "Personas" tab
    And I should see the "Contacts" tab
    And I should see the "Terminal" tab
