Feature: App shell and navigation
  As a user I can open the app and switch between views so that I can access all features.

  Scenario: App loads successfully
    Given I am on the app home page
    Then the page title should contain "tb-solid-pod"

  Scenario: Switch to Terminal from home
    Given I am on the app home page
    When I click the "Terminal" tab
    Then I should see the CLI prompt or welcome message
