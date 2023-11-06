Feature: User Authentication
  Scenario: User login with correct credentials
    Given the user has already registered with a verified email or mobile phone
    When the user provides a correct username and password
    Then the user should be granted access to their account

Feature: Database Initialization
  Scenario: Database does not exist on server start
    Given the server is starting up
    And the database does not exist
    When the server initializes the database
    Then a new SQLite database should be created
    And a "users" table should be created if not present

Feature: User Registration
  Scenario: New user registration with valid details
    Given the user has chosen a valid username, real name, and password
    When the user submits the registration form
    Then a new user account should be created in the database
    And the user should receive a verification method choice for email or SMS

Feature: Email Verification
  Scenario: User verifying email address
    Given the user has registered with an email address
    When the user clicks on the verification link sent to their email
    Then the user's email should be marked as verified in the database

Feature: Mobile Phone Verification
  Scenario: User verifying mobile phone number
    Given the user has registered with a mobile phone number
    When the user submits the verification code received by SMS
    Then the user's mobile phone should be marked as verified in the database

Feature: User Relationships
  Scenario: User follows another user
    Given the user is logged in and has a verified account
    When the user chooses to follow another user
    Then the targeted user should be added to the user's following list

Feature: Content Publishing
  Scenario: User publishes a card
    Given the user is logged in and has a verified account
    When the user creates a card and publishes it
    Then the card should be added to the user's published content

  Scenario: User creates and publishes a stack
    Given the user is logged in and has a verified account
    And the user has already published cards
    When the user groups cards into a stack and publishes it
    Then the stack should be added to the user's published stacks

Feature: Session Management
  Scenario: User logs out
    Given the user is logged in
    When the user chooses to log out
    Then the user's session token should be expired

Feature: Password Policy Enforcement
  Scenario: User sets a password complying with the policy
    Given the user is on the password creation or reset page
    When the user enters a password that fits the 8-char policy with required character types
    Then the password should be accepted and set for the user's account

Feature: Verification Requirement Before Sign-In
  Scenario: User signs in for the first time
    Given the user has registered but has not yet verified their email or mobile phone
    When the user attempts to sign in
    Then the user should be prompted to verify their email or mobile phone before being allowed to sign in

Feature: Session Promotion
  Scenario: Guest session promotion upon verification
    Given the user has a guest session
    And the user completes the verification process
    When the user signs in for the first time
    Then the guest session should be promoted to a user session

Feature: Password Reset
  Scenario: User requests a password reset
    Given the user has forgotten their password
    When the user requests a password reset
    Then a one-time login code should be sent to the user's email or mobile based on their preference

Feature: One-Time Login
  Scenario: User logs in with a one-time code
    Given the user has received a one-time login code
    When the user enters the one-time login code
    Then the user should be logged in
    And the user should be prompted to reset their password

Feature: Unique Magic Code Generation
  Scenario: Generating a unique one-time login code
    Given a user requests a password reset
    When the server generates a one-time login code
    Then the code should be unique and not currently active for any user

Feature: User Preference Management
  Scenario: User saves a key/value preference
    Given the user is logged in and has a verified account
    When the user sets a preference with a key and a value
    Then the preference should be saved in the user's profile in the database
