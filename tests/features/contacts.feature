Feature: Contacts UI
  As a user I can manage contacts in the graphical UI so that I can view and edit my address book.

  Scenario: Open Contacts tab and see contacts list
    Given I am on the app home page
    When I click the "Contacts" tab
    Then I should see the contacts view

  Scenario: Contacts tab shows list or empty state
    Given I am on the app home page
    When I click the "Contacts" tab
    Then I should see either a contacts list or "No contacts" or "Add" in the view
