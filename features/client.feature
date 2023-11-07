Feature: Project Codename: BDDField
    # Feature: can you have multiple features per `.feature` file?
    # Feature: can you side-bar out other features like @TODO or @pushToNextSprint?
    # Feature: static analysis on the features actually generates the features in the background
    #   automatically spawning BDD feature tests,
    #   iterating until all the tests pass,
    #   then generating the final locked feature file.

    @Planned
    Scenario: user is texted or emailed a one-time code, they can log in once using that code.

        As a user, i want a way to send a message via email or sms to my device, with a 8 to 16 digit code that i will use to log in
        (shorter when less users online) #Easter Egg

        Given i am a user
        When i request a one-time code
        Then i receive a one-time code via email or sms
        And i can use that code to log in

    Scenario: system bootup
    
            # Given i am authenticated @TODO
            Given a fresh sandbox
            When the system boots
            Then the most recent offline state is loaded into memory
            And last selected rootFieldID is loaded
    
    Scenario: field access
            When the System loads a Field
            Then the Field is loaded into memory
            And the Field is displayed on the screen
        
    # imagine get/set for everything by default
    # TODO: give advanced example of accessing a shared cache where multiple fields can all just be references to one memory location
    # aka a 'pointer'
    Scenario: cached field access - cache miss
        When a Field is loaded by the System in the Sandbox
        Then the Field checks it's internal cache to see if it has already been accessed and computed
        When the Field internal cache check misses
        Then the Field computes it's value
        And  the Field caches it's value
        And  the Field returns it's value
    
    Scenario: cached field access - cache hit
        When a Field is loaded by the System in the Sandbox
        Then the Field checks it's internal cache to see if it has already been accessed and computed
        When the Field internal cache check hits
        Then the Field returns it's cached value

    Scenario: the system boots with no offline state
            Given there was no offline state
            When the system boots
            Then the system loads the default state

    # Scenario: the system boots with valid offline state
    # Scenario: the system boots with in-valid offline state
    # Scenario: the system boots with mismatched version number compared to server's value

    Scenario: system self test mode
        # the system enters in self test mode when there is no previous offline state to load (first boot verification) or if:
        # -- the server version number has changed
        # -- there was some error loading offline state and the local cache was cleared

        Given the system is in self test mode
        When the system boots
        Then the system loads the self test state
    
    Scenario: viewing the text representation of the system
        Given the SystemViewer is in "ascii" viewing mode
        When I load the system
        Then the SystemViewer displays the LandingField in ascii

    Scenario: landing field is a cached, computed field
        Given the system is in self test mode
        When the system boots
        Then the system loads the self test state
        And the system loads the LandingField
        And the LandingField is displayed on the screen
        And the default viewing mode is "ascii"
    
    Scenario: user changes viewing mode
        Given the system is booted
        When the user changes the primary (or default) SystemViewer viewing mode to "cards" or "ascii"
        Then the SystemViewer displays the LandingField in the new viewing mode

    Scenario: user wants a clear field
        Given the system is booted
        And a FieldViewer is displayed
        When the user presses the "clear" button
        Then the FieldViewer is closed
        And a new FieldViewer is opened

    # A SubFieldViewer is identical to a FieldViewer, 
    # only the FieldViewer is the root (no parents/related fields/backreferences) 
    # and the SubFieldViewer has at least one current parent/related/backreferencing FieldViewer
    Scenario: user adds SubFields
        Given the system is booted and the LandingField is displayed
        When the user presses the "add" button
        Then a new SubFieldViewer is opened displaying a new EmptySubField
    
    Scenario: user imports SubFields
        Given the user is on the LandingField
        When the user toggles the command bar
        And the user starts to type "Cl"
        Then the user is presented with a list of commands
        And the topmost command is "Clock"
        When the user selects "Clock"
        Then a new SubFieldViewer is opened displaying a new ClockSubField
        And the RootField's cache is updated so it knows that it contains a ClockSubField which will need Pulsed

    @SelfTest # Runs During SelfTest mode
    Scenario: Sandbox > System > Executor > Field > SubField pattern
        # This is more of a feature
        # It's the core update loop of the virtual machine
        # it's modular so hot-swapping can be done on a per-field basis,
        # and it's self healing cause it uses ai to self-monitor it's abilities
        # it's BDD and NLP all the way down baby :turtle:

        Given I am on the LandingField
        When I add a Clock Field
        Then the Clock Field is added to the LandingField
        And I see it displays the current time

    @SelfTest
    Scenario: Pomodoro Timer
        # TODO: a mode that spawns a replacement timer for alternating durations of 20 and 5 minutes
        Given I am in an EmptyField
        When I add a Timer Field
        And I set the Timer Field to 25 minutes
        And I set the sound to "alarm"
        And I start the Timer Field
        Then the Timer Field counts down from 25 minutes
        And the Timer plays the "alarm" sound when it reaches 0
        And the Timer Field is removed from the EmptyField

    @SelfTest
    Scenario: Todo Lists
        Given I am in an EmptyField
        When I add a TodoList Field
        And I add a TodoItem to the TodoList with the name "Buy Milk"
        Then the TodoList displays the TodoItem "Buy Milk"
        
        When I flag the TodoItem as "completed_at"
        Then the TodoList visually reflects that the "Buy Milk" TodoItem is completed

        When I toggle the TodoList's showCompleted field to "false"
        Then the TodoList hides the completed TodoItem
        And the TodoList is visually empty

        When I drag one TodoItem on top of another TodoItem
        Then the dragged TodoItem is inserted into the TodoList at the position of the dropped TodoItem

    @SelfTest
    Scenario: Cross TodoList Drag and Drop
        # Demonstrates Field<->Field interactions and compatibility based on shared types
        Given I am in an EmptyField
        When I add a TodoList Field
        And I add a Second TodoList Field
        And I add a TodoItem to the TodoList with the name "Buy Milk"
        When I drag the TodoItem from the first TodoList to the Second TodoList
        Then the TodoItem is removed from the first TodoList
        And the TodoItem is added to the Second TodoList

    @SelfTest
    Scenario: Undo/Redo

    @SelfTest
    Scenario: Cut/Copy/Paste

    @SelfTest
    Scenario: ClipboardHistory

    @SelfTest
    Scenario: NavigationHistory

    @SelfTest
    Scenario: Tabbed Browsing

    @SelfTest
    Scenario: Fuzzy Search

    @SelfTest
    Scenario: Command Palette / Command Bar / Command Prompt / Terminal / Fuzzy Search / Search Anywhere
        # Features can have aliased names so that anyone can find them more easily

    @SelfTest
    Scenario: Dynamic Field Tags
        # Tags that are self-aware, and can remove themselves or even enable/disable themselves at particular hook points / times56

    @SelfTest
    Scenario: Physics Engine
        # Fields can have physics applied to them as they "exist" within the outer flow field with other sibling fields "on their level" in the current FieldView context / ReferenceFrame
        # Fields can act on other fields in certain view modes
        # For example, weight can be applied to edges between nodes, or, weight can be accumulated by a node with many backreferences or forward references
    
    @SelfTest
    Scenario: Forward References // Demonstrates Lazy / Eager Evaluation of Deeply Nested Subgraph References

    @SelfTest
    Scenario: Parallel Execution // Demonstrates parallel execution of Executable / Computable Fields

    @SelfTest
    Scenario: Synchronous Execution + Await/Async pattern // Demonstrates the ability for ComputationStepFields to be executed synchronously or asynchronously, and the ability to await the result of an asynchronous computation step

    @SelfTest
    Scenario: The ability to define ADDITIONAL self tests WITHIN the APP itself
        Given I am in the LandingField
        When I add a SelfTest Field
        Then the SelfTest Field is added to the LandingField
        And the next time the SelfTest routine is run, the SelfTest Field is executed

    @SelfTest
    Scenario: The ability to define literals and constants that are shared in a global namespace accessible to all Fields
        Given I am in the LandingField
        When I add a GlobalConstant Field
        And I set the GlobalConstant Field's name to "PI"
        Then the GlobalConstant Field is added to the LandingField
        When PI is pulsed
        Then PI has an internally cached value of 3.14159
        And PI returns the value 3.14159
    
    @SelfTest
    Scenario: Hello World String
        Given I am in the LandingField
        When I add a String Field
        And I set the String Field's value to "Hello World"
        Then the String Field is added to the LandingField
        And the String Field displays the value "Hello World"

    
    @SelfTest
    Scenario: The default behavior of the System to Warn when a Field is added that has a name that already exists in the current namespace

    @SelfTest
    Scenario: The ability to disable warning if a Field is added that has a name that already exists in the current namespace
