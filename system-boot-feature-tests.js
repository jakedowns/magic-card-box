let C; // store.state.CONST
const MISSION_STATEMENT = `
Hello, it's ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}.
You're currently viewing Magic Card Box
a prototype Operating system built for today from the ground up using today's technology and standards.
we're moving beyond the technical debt of the past
into the exciting world of AI and XR
It's a fuzzy future, but we're having fun exploring the possibilities
the bicycle for the mind just became the jetpack for the brain
`

/**
 * 
 */
class FieldNotPresentError extends Error {
    /**
     * 
     * @param string id 
     * @param {context,source} extras 
     */
    constructor(id, extras) {
        // isA(Promise, id)
        if (typeof id?.then === 'function') {
            throw new Error("id is a promise, not a string literal field id. \n Did you forget to await dispatch('addField')?")
        }
        // AWAIT ANY PROMISES IN EXTRAS!
        super(id);
        this.name = `FieldNotPresentError field ID: ${id}`;
        this.name += "\n context: " + extras?.context;
        this.name += "\n source: " + extras?.source;
    }
}

// literally just a string id
// but we make it a class so we can instanceof check it 
class FieldPointer {
    id = null;
    constructor(id){
        this.id = id;
    }
}

// literally just a string id
// but we make it a class so we can instanceof check it 
class FieldReference {
    id = null;
    constructor(id){
        this.id = id;
    }

    // get the referenced field
    get field(){
        if(!store.state.fields[this.id]){
            throw new FieldNotPresentError(this.id,{
                context:'FieldReference.field',
                source:'FieldReference'
            })
        }
        return store.state.fields[this.id]
    }
}

class MarqueeConfig {
    text = 'hello world'
    speed = 1
    direction = 'right'
    // computed cache
    update() {

    }

    // our render loop would probably make this marquee reset every frame
    // rather than letting it be left alone in the DOM for the browser to handle
    // maybe we need a renderOnce for "static" fields that don't want to be re-rendered every frame
    // OR maybe we re-implment the browser's marquee tag in our own way
    // that would give us more customization options and control in terms of pausing, etc...
    renderOnce() {
        return `<marquee style="">${this.text}</marquee>`
    }
}

class TimerConfig {
    duration = 10 // seconds
    sound = 'ding'
    // computed cache
    currentTime = null
    startTime = null
    expired = false
    start() {
        this.startTime = Date.now();
    }
    // TODO: allow this Field to be paused and resumed
    // TODO: allow this Field to de-register from the executor when it's done
    // so we don't keep calling it once it has no more work to do
    update() {
        this.currentTime = Date.now();

        if (!this.expired) {
            // check if we have expired
            if (this.currentTime - this.startTime >= this.duration) {
                this.expired = true;
                // play sound
                console.warn('todo play sound ' + this.sound);

                console.warn('Timer Field: todo de-register from executor')
            }
        }
    }
}
class ClockConfig {
    timezone = 'default'
    // computed cache
    currentTime = null
    update() {
        // recompute current time taking timezone into account
        this.currentTime = Date.now();
    }
}

class CompleteableField extends Field {
    completed_at = null;
    constructor(payload) {
        super(payload);
    }
    // toggle by passing nothing
    // set by passing a desired status
    toggleCompleted(status) {
        if (typeof status === 'undefined') {
            this.completed_at = this.completed_at ? null : Date.now();
        } else {
            this.completed_at = status ? Date.now() : null;
        }
    }

}

const Operations = {
    ADD: '+',
    SUBTRACT: '-',
    MULTIPLY: '*',
    DIVIDE: '/',
    // Further operations can be added here.
};

class MathFieldConfig {

    // since our operands can be literals or references to OTHER Fields that may need to be computed,
    // we need to unwrap the literal values when
    // we're ready to compute the result
    // this is lazy evaluation
    // and eager evaluation can be triggered by calling recompute() earlier than the first consumer of the result
    leftHandUnwrapped = null
    rightHandUnwrapped = null
    _result = 'uninitialized'

    constructor(leftOperand, operator, rightOperand) {
        this.setOperands(leftOperand, rightOperand);
        this.setOperator(operator);
        this._result = null;
    }

    // ok, we should probably migrate to typescript
    // this manual type checking is getting out of hand
    setOperands(left, right) {
        // NOTE:
        // these values can be literal numbers
        // or they can be references to other fields
        if (
            !(left instanceof FieldReference) 
            && !(typeof left === 'number')
        ) {
            throw new Error('Unsupported left operand type. '+JSON.stringify({
                type:typeof left,
                left
            }));
            this.leftHandOperand = left;
        }


        if (
            !(right instanceof FieldReference) 
            && !(typeof right === 'number')
        ) {
            throw new Error('Unsupported right operand type. '+JSON.stringify({
                type:typeof right,
                right
            }));
        }else{
            this.rightHandOperand = right;
        }
    }

    setOperator(op) {
        if (Object.values(Operations).includes(op)) {
            this.operator = op;
        } else {
            throw new Error('Unsupported operation.');
        }
    }

    // force a recompute
    clearResult(){
        this._result = 'uninitialized'; // TODO: make a CONST "type"
    }

    // NOTE: we can configure this Field to either
    // - evaluate immediately
    // - evaluate continiously or periodically
    // - only when Executor pulses' it's parent Field
    // - only when result is accessed for the first time
    get result() {
        // Only compute if _result is null to cache the result
        if (this._result === 'uninitialized') {
            this._result = this.compute();
        }
        return this._result;
    }

    maybeUnwrapOperand(operand) {
        // if the operand is a Field and not a literal Number, check for a result property
        // if it exists, use that value, otherwise use the Field itself
        // if it's a literal, just return the literal
        // if (typeof operand === 'number') {
        //     return operand;
        // }
        if (operand?.result) {
            return operand.result;
        }
        return operand;
    }

    compute() {
        this.leftHandUnwrapped = this.maybeUnwrapOperand(this.leftHandOperand);
        this.rightHandUnwrapped = this.maybeUnwrapOperand(this.rightHandOperand);   

        switch (this.operator) {
            case Operations.ADD:
                return this.leftHandOperand + this.rightHandOperand;
            case Operations.SUBTRACT:
                return this.leftHandOperand - this.rightHandOperand;
            case Operations.MULTIPLY:
                return this.leftHandOperand * this.rightHandOperand;
            case Operations.DIVIDE:
                // Additional check to prevent division by zero
                if (this.rightHandOperand === 0) {
                    throw new Error('Division by zero is not allowed.');
                }
                return this.leftHandOperand / this.rightHandOperand;
            default:
                throw new Error('Operation not supported.');
        }
    }

    // Recompute and invalidate the cache if needed
    recompute() {
        this._result = null;
        return this.compute();
    }

    // Async computation can be useful if the calculations are expected to be heavy or time-consuming
    async computeAsync() {
        // Simulate asynchronous operation with a timeout or potentially more complex logic
        await new Promise(resolve => setTimeout(resolve, 0));
        return this.compute();
    }

    // Asynchronous result fetching with caching
    async awaitResult() {
        return this._result ?? await this.computeAsync();
    }
}

class TodoListConfig { }
class CompleteableConfig { }
class WeatherConfig { }
class SunPositionConfig { }
class MoonPositionConfig { }
class UserLocationConfig { }
class LoopExampleConfig { }
class SynchronousExampleConfig { }
class AsynchronousExampleConfig { }

/** @deprecated */
const SYSTEM_STACK_ID = '100';
/** New */
const FEATURE_TEST_SANDBOX_ID = 'featureTestSandbox';
const FEATURE_TEST_ROOT_FIELD_ID = 'featureTestRootField';

// add our test sub-fields
const FEATURE_TEST_SUBFIELD_IDS = {
    FT_SF_MARQUEE: 'FT_SF_MARQUEE',
    FT_SF_TIMER: 'FT_SF_TIMER', // pomodoro babyyyyy
    FT_SF_CLOCK: 'FT_SF_CLOCK',
    FT_SF_TODO_LIST: 'FT_SF_TODO_LIST',
    FT_SF_WEATHER: 'FT_SF_WEATHER',
    FT_SF_SUN_POSITION: 'FT_SF_SUN_POSITION',
    FT_SF_MOON_POSITION: 'FT_SF_MOON_POSITION',
    FT_SF_USER_LOCATION: 'FT_SF_USER_LOCATION',

    FT_SF_LOOP_EXAMPLE: 'FT_SF_LOOP_EXAMPLE',
    FT_SF_SYNCHROUS_EXAMPLE: 'FT_SF_SYNCHROUS_EXAMPLE',
    FT_SF_ASYNC_EXAMPLE: 'FT_SF_ASYNC_EXAMPLE',
}

let FEATURE_TEST_SUBFIELD_TAGS = {};

const FEATURE_TEST_SUBFIELD_CONFIGS = {
    FT_SF_MARQUEE: {
        marquee_config: new MarqueeConfig({
            text: 'hello world',
            speed: 1,
            direction: 'right'
        })
    },
    FT_SF_TIMER: {
        timer_config: new TimerConfig({
            duration: 10, // seconds
            sound: 'ding'
        })
    },
    FT_SF_CLOCK: {
        clock_config: new ClockConfig({
            // use the user's timezone by default
            timezone: 'default',
            getTime() {
                return Date.now();
            }
        })
    },
    FT_SF_TODO_LIST: {
        todo_list_config: new TodoListConfig({
            items: [
                new CompleteableField({
                    content: 'test todo item',
                    completed: false
                })
            ]
        })
    },
    FT_SF_WEATHER: {
        weather_config: new WeatherConfig({
            // TODO: show how we can wait for the user location field to resolve and then use that value
            getWeather() {
                return 'sunny';
            }
        })
    },
    FT_SF_SUN_POSITION: {
        sun_position_config: new SunPositionConfig({
            // TODO: show how we can wait for the user location field to resolve and then use that value
            getSunPosition() {
                return 'high';
            }
        })
    },
    FT_SF_MOON_POSITION: {
        moon_position_config: new MoonPositionConfig({
            // TODO: show how we can wait for the user location field to resolve and then use that value
            getMoonPosition() {
                return 'high';
            }
        })
    },
    FT_SF_USER_LOCATION: {
        user_location_config: new UserLocationConfig({
            getUserLocation() {
                return 'USA';
            }
        })
    },
    FT_SF_LOOP_EXAMPLE: {
        loop_example_config: new LoopExampleConfig({
            getLoopExample() {
                return 'loop example';
            }
        })
    },
    FT_SF_SYNCHROUS_EXAMPLE: {
        synchronous_example_config: new SynchronousExampleConfig({
            getSynchronousExample() {
                return 'synchronous example';
            }
        })
    },
    FT_SF_ASYNC_EXAMPLE: {
        asynchronous_example_config: new AsynchronousExampleConfig({
            getAsynchronousExample() {
                return 'asynchronous example';
            }
        })
    },
}

async function bootSystemAsync() {
    console.warn(MISSION_STATEMENT)

    // wait for the store.state.CONST.TYPES to be populated
    await new Promise((resolve) => {
        const interval = setInterval(() => {
            console.warn('waiting for const types...', store.state.CONST)
            if (
                store.state.CONST.TYPES
                && store.state.CONST.TAGS
            ) {
                clearInterval(interval);
                resolve();
            }
        })
    }, 100);

    // OnConstsReady
    C = store.state.CONST;

    FEATURE_TEST_SUBFIELD_TAGS = {
        FT_SF_MARQUEE: [C.TAGS.MARQUEE],
        FT_SF_TIMER: [C.TAGS.TIMER],
        FT_SF_CLOCK: [C.TAGS.CLOCK],
        FT_SF_TODO_LIST: [C.TAGS.TODO_LIST],
        FT_SF_WEATHER: [C.TAGS.WEATHER],
        FT_SF_SUN_POSITION: [C.TAGS.SUN_POSITION],
        FT_SF_MOON_POSITION: [C.TAGS.MOON_POSITION],
        FT_SF_USER_LOCATION: [C.TAGS.USER_LOCATION],

        FT_SF_LOOP_EXAMPLE: [C.TAGS.LOOP_EXAMPLE],
        FT_SF_SYNCHROUS_EXAMPLE: [C.TAGS.SYNCHRONOUS_EXAMPLE],
        FT_SF_ASYNC_EXAMPLE: [C.TAGS.ASYNCHRONOUS_EXAMPLE],
    }

    /** @deprecated */
    // verify a stack exists which represents the system
    //if (!store.state.stacks[SYSTEM_STACK_ID]) {
    // !!! for now, always recreate this stack !!!
    // if it was .closed before, make sure it's .closed
    // if it was .collapsed before, make sure it's .collapsed
    store.commit('addStack', {
        name: 'System',
        //tags: [TAG_TEST_STACK],
        forceId: SYSTEM_STACK_ID,
        collapsed: store.state.stacks[SYSTEM_STACK_ID]?.collapsed ?? false,
        closed: store.state.stacks[SYSTEM_STACK_ID]?.closed ?? false
    });

    // FIELD REFACTOR NOTE:
    // when it comes time to refactor this bit of code,
    // i think we should rename SystemStack to SelfTestStack or BootStack
    // i'm going to create a new "field" stack for the new field refactor
    // we are moving away from cards and stacks to Fields of Fields
    // so we need a new stack to represent the field
    // BUT WE ALSO NEED a meta stack to represent the system's internal representation of a field
    // if that makes sense, like not an Instance or a Factory, but the definition of a literal field
    // make sure we have a Field Field
    // could this be NewField???

    // add our System Sandbox (with accompanying executor)
    // add a default field to the system
    // add our Feature Test Case subfields to prove the executor is working
    // > 1. marquee subfield: renders a scrolling marquee of text on a loop
    // > 2. timer subfield: renders a timer that counts down from 10 to 0 and plays a sound when it reaches 0
    // > 3. clock subfield: displays the current time
    // > 4. todo-list subfield: displays a list of todo items and their completed status
    // > 5. weather subfield: displays the current weather
    // > 6. sun position subfield: displays the current position of the sun
    // > 7. moon position subfield: displays the current position of the moon
    // > 8. user location subfield: estimates the users location based on IP address

    // this demo shows how subfields can communicate with each other,
    // for example, the user location subfield can publish the location data for the sun/moon/weather subfields to consume in their evaluation of the current sun/moon/weather conditions

    // when a sandbox is deleted, we also need to delete:
    // 1. it's executor
    // 2. maybe we keep the fields and let them be deleted separately?
    // 3. maybe we give the option to the user to migrate fields or subfields when they try to delete a field


    await store.dispatch('addSandboxAction', {
        name: 'Feature Test Sandbox',
        id: FEATURE_TEST_SANDBOX_ID,
    })
    const featureTestSandbox = store.state.sandboxes[FEATURE_TEST_SANDBOX_ID];

    // delete any "FEATURE_TEST_ROOT_FIELD_ID" before recreating our test root field to prevent it from duplicating on each boot
    //store.commit('deleteField', FEATURE_TEST_ROOT_FIELD_ID);

    // NOTE: when we add a field,
    // WHEN we pass a sandboxID
    // the sandbox will automatically attempt to set the field as the rootFieldID of the sandbox
    // if the sandbox already has a rootFieldID, we will ignore this step
    // unless we have specified that we want to force override the rootFieldID and set the newly added 
    // field as the root field (entrypoint) of the sandbox
    // so the executor knows where to begin execution for the sandbox / recursive field map
    store.commit('addField', {
        name: FEATURE_TEST_ROOT_FIELD_ID, // can be any string
        // we're going to use a forced id so we can delete it on boot
        // could also delete by tag
        id: FEATURE_TEST_ROOT_FIELD_ID,

        // assign it to our sandbox (note fields can be reused across sandboxes)
        // so we might need to support an array of sandbox ids
        sandboxID: FEATURE_TEST_SANDBOX_ID,

        // the entry point to an entrypoint is a root field
        field_type: store.state.CONST.TYPES.ROOT_FIELD, // might not need to distinguish ROOT_FIELD from FIELD type, if there's no parentFieldID, it's a root
    })



    for (const [key, value] of Object.entries(FEATURE_TEST_SUBFIELD_IDS)) {

        const tagsArray = [
            ...FEATURE_TEST_SUBFIELD_TAGS[key],
            ...[
                C.TAGS.TEST_TAG,
                // TODO: tags that can decompose into a group of tags
                // like a tag could indicate that it itself requires other tags
                C.TAGS.EXECUTABLE
            ]
        ]
        //console.warn('bootSystem adding subfield', { key, value, tagsArray })
        //store.commit('deleteField', value);
        store.commit('addField', {
            name: key,
            id: value,
            sandboxID: FEATURE_TEST_SANDBOX_ID,
            parentFieldID: FEATURE_TEST_ROOT_FIELD_ID,

            tags: tagsArray,
            ...FEATURE_TEST_SUBFIELD_CONFIGS[key]
        })
    }

    // in the gui these composable options provided by tags
    // will be helpful for no-code users
    // on the code side, they're a little cumbersome,
    // but they exist for a purpose,
    // and maybe at some point if this project continues,
    // we can do some coffeescript style pre-processing and 
    // meta programming to make the code side easier to work with
    // maybe even our own scripting language

    // attach our testing harness system so we can assert that the callback is called after the delay

    // get the most recently created field id
    // need to maybe change to dispatch and await a return value
    // so we don't get bad id if another field is created in the meantime
    // but for now, this is fine

    // tag it as executable so the executor knows to run it
    store.commit('fieldAddTags', {
        fieldID: FEATURE_TEST_ROOT_FIELD_ID,
        tags: [C.TAGS.EXECUTABLE]
    })

    // the Executor will iterate over all child fields (recursively) and step their internal program
    // TODO: need to look into using RequestAnimationFrame to prevent blocking the main thread
    // like DOTs iterates in parallel in Unity's Entity Component System UECS
    // the Executor will check if the field has the EXECUTABLE tag
    // if so, it will call it's execute method
    // and handle shuttling any return values to appropriate associated caching and observing fields
    // it's updates rippling through fields
    // it's beautiful
    // (some day we can move some things to background workers and maybe WASM but for now, this is fine...)


    // }else{
    //     console.warn('system stack found?',{
    //         stack:store.state.stacks[SYSTEM_STACK_ID]
    //     })
    // }
    const systemStack = store.state.stacks[SYSTEM_STACK_ID];
    console.warn('system stack?', {
        systemStack,
        um: store.state.stacks[SYSTEM_STACK_ID]
    })

    // Define the feature tests as an array of objects
    const featureTests = [
        {
            name: 'the system has a default field added by default',
            test(i) {
                return store.state.fields[FEATURE_TEST_ROOT_FIELD_ID] !== undefined;
            }
        },
        {
            name: 'the feature test root field has several child subfields',
            test(i) {
                const field = store.state.fields[FEATURE_TEST_ROOT_FIELD_ID];
                const childFieldIDs = field.childFieldIDs;
                if (!childFieldIDs) {
                    console.error("field has no childFieldIDs prop?", { field })
                    throw new Error("field has no childFieldIDs prop?")
                }
                return childFieldIDs.length === Object.keys(FEATURE_TEST_SUBFIELD_IDS).length;
            }
        },
        {
            name: 'the user can add a new field with a custom name',
            async test(i) {
                const name = 'test field name';
                const id = await store.dispatch('addField', {
                    name,
                    tags: [C.TAGS.TEST_TAG] // for cleanup after self-test
                });
                console.warn('bootSystem FeatureTest ' + i.name, {
                    id,
                    lastFieldId: store.state.lastFieldId,
                })
                const field = store.state.fields[id];
                if (!field) {
                    throw new FieldNotPresentError(id)
                }
                if (field.name !== name) {
                    throw new Error("field name does not match")
                }
                return true;
            }
        },
        // TODO: new FeatureTest() => FeatureTest.run()
        {
            name: 'the user can assign tags to a field and they will be saved',
            required: true,
            async test(i) {
                const name = 'test field name';
                const tags = [C.TAGS.TEST_TAG];
                const id = await store.dispatch('addField', {
                    name,
                    tags
                });
                const field = store.state.fields[id];
                if (!field) {
                    throw new FieldNotPresentError(id, {
                        context: i.name,
                        source: i.test.toString()
                    })
                }
                if (field.tags.length !== tags.length) {
                    throw new Error("field tags length does not match")
                }
                return true;
            }
        },
        {
            name: 'local changes are reflected to the server and made available from other Sandbox clients (RemoteFieldView)',
            test(i) {
                return -1;
            }
        },
        {
            name: 'clients can send messages to all connected clients',
            test(i) {
                return -1;
            }
        },
        {
            name: 'clients can send messages to specific connected clients',
            test(i) {
                return -1;
            }
        },
        {
            name: 'clients can send encrypted messages to self across clients via a private channel',
            test(i) {

            }
        },
        {
            name: 'fields can have parent field ids specified, when they are, the parent\'s childFieldIDs are updated',
            async test(i) {
                const name = 'test field name';
                const tags = [C.TAGS.TEST_TAG];
                const id = await store.dispatch('addField', {
                    name,
                    tags
                });
                const field = store.state.fields[id];
                if (!field) {
                    throw new FieldNotPresentError(id)
                }
                if (field.tags.length !== tags.length) {
                    throw new Error("field tags length does not match")
                }
                return true;
            }
        },
        // SINCE FIELDS CAN BE ARBITRARILY REFERENCED MULTIPLE TIMES BY MULTIPLE OTHER FIELDS,
        // THERE WILL ALWAYS BE ONE PARENT FIELD, THE FIELD THAT CREATED THE SUBFIELD,
        // BUT THERE WILL ALSO BE "VIRTUAL" PARENTS AND 'VIRTUAL" CHILDREN THAT ARE JUST REFERENCES TO ARBITRARY FIELDS...
        {
            name: 'fields can be virtually related to any other fields, even themselves, multiple times in a given FieldView',
            async test(i) {
                const name = 'testRootField_001';
                const tags = [C.TAGS.TEST_TAG];
                const rootFieldID = await store.dispatch('addField', {
                    id: name, // override auto-assigned id for fixed test id
                    name,
                    tags
                });
                // fields[name] would work here too
                const rootField = store.state.fields[rootFieldID];
                if (typeof rootFieldID?.then === 'function') {
                    throw new Error("rootFieldID is a promise, not a string literal field id. \n Did you forget to await dispatch('addField')?")
                }
                if (!rootField) {
                    throw new Error("rootField does not exist RootFieldID: " + rootFieldID)
                }
                // use our testing DSL to simplify this test
                // we use this to make our tests more readable,
                // and keep our auto-generated documentation up to date
                // this helps with issue tracking, and project management
                // it's the whole purpose we're going through the exercise of writing this code (with CHATGPT's help)
                // it's why we're dog-fooding this system
                // it's why we're doing it
                // cause if Notes, Reminders, Workflowy, Clickup, Emails, Messages, Chatrooms, Forums, Wikis, Podcasts had solved these issues, they'd all be one mega-platform
                // but they're not, the market is still deciding the best forms of all of these interactive platforms
                // the technology is not like cards which have been around for a century
                // social media is a baby in comparison
                // digital content creation and management is still in a nascent stage
                // that's why we're trying to level the playing field like Flash did
                // like unity and unreal engine almost do
                // like the http web standards allow us to do efficiently
                // like roblox and dreams and gravity sketch and figma and google docs ALMOST do
                // but it's still fractured
                // it's what the sims and roller coaster tycoon make us feel when we play them
                // applied to the dollhouse that is our real life
                // our real chores
                // our real responsibilities,
                // our real honsest accountability to ourselves and those around us
            }
        },
        {
            name: 'Math fields can compute basic math operations',
            async test(i) {
                // given a fresh field
                // when we add a math field
                // and we configure it to add 1 + {the value of another field}
                // then we pulse the field one step
                // then the field should have a value of 1 + {the value of the other field}

                // given a fresh field
                const testField = store.state.fields[FEATURE_TEST_ROOT_FIELD_ID];
                const referenceFieldId = await store.dispatch('addField', {
                    name: 'testReferenceLiteralField',
                    tags: [C.TAGS.LITERAL],
                    literalConfig: {
                        type: Number,
                        value: 9
                    }
                })
                // todo rename to addFieldAndGetIDAsync so you know you have to await it...
                const mathNodeId = await store.dispatch('addField', {
                    name: 'testMathNode',
                    tags: [C.TAGS.MATH],
                    parentFieldID: FEATURE_TEST_ROOT_FIELD_ID,
                    mathNodeConfig: new MathFieldConfig(1, Operations.ADD, new FieldReference(referenceFieldId))
                });
                // pulse the Sandbox.Executor one pulse and check the result
                const sandbox = store.state.sandboxes[testField.sandboxID];
                
                if(!sandbox){
                    throw new Error("sandbox not found for field: "+testField.id)
                }
                if(!sandbox?.executorID){
                    throw new Error("sandbox executorID not found for field: "+testField.id)
                }

                // TODO: getter:
                //const executor = store.getters.executorForSandboxID(testField.sandboxID);
                const executor = store.state.executors[sandbox.executorID];
                if(!executor){
                    throw new Error("executor not found for sandboxID: "+sandbox.id+" executorID: "+sandbox.executorID)
                }
                executor.pulse();
            }
        }


        // {
        //     name: 'The system loads users previous session (if any)',
        //     test(i) {
        //         return -1;
        //     }
        // },
        // {
        //     name: 'The system tracks multiple stacks of cards',
        //     test(i) {
        //         const before = Object.keys(store.state.stacks).length;
        //         // add a stack
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const after = Object.keys(store.state.stacks).length;
        //         // reset
        //         store.dispatch('deleteStackSilent', stackId);
        //         return after - before === 1;
        //     }
        // },
        // {
        //     name: 'Stacks can be collapsed or expanded',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const stack = store.state.stacks[stackId];
        //         const before = stack.collapsed;
        //         store.commit('toggleCollapse', stackId);
        //         const after = stack.collapsed;
        //         store.dispatch('deleteStackSilent', stackId);
        //         return before !== after;
        //     }
        // },
        // {
        //     name: 'Stacks can be in a closed state',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const stack = store.state.stacks[stackId];
        //         const before = stack.closed;
        //         store.commit('setStackClosed', { stackId, closed: true });
        //         const after = stack.closed;
        //         store.dispatch('deleteStackSilent', stackId);
        //         return before !== after;
        //     }
        // },
        // {
        //     name: 'Stacks can be focused',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const stack = store.state.stacks[stackId];
        //         const before = stack.focused;
        //         store.commit('setStackFocused', { stackId, focused: true });
        //         const after = stack.focused;
        //         store.dispatch('deleteStackSilent', stackId);
        //         return before !== after;
        //     }
        // },
        // {
        //     name: 'Stacks can be colored green if all their children are passing',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         const id = store.state.stack_order[store.state.stack_order.length - 1];
        //         const stack = store.state.stacks[id];
        //         const before = stack.passing;
        //         if (stack.passing !== -1) {
        //             throw new Error("expected stack default passing to be -1")
        //         }
        //         store.commit('addCard', {
        //             stackId: id,
        //             content: 'test'
        //         });
        //         const cardId = stack.card_order[stack.card_order.length - 1];
        //         const afterAddingOneCard = stack.passing;
        //         if (before !== afterAddingOneCard) {
        //             throw new Error("expected passing to remain -1 after adding card")
        //         }
        //         // flag child as passing => expect parent stack to be passing
        //         store.commit('setCardPassingStatus', { card: stack.cards[cardId], passing: true });
        //         if (stack.passing !== true) {
        //             throw new Error("expected passing to be true after flagging only child as passing")
        //         }
        //         // add a second child => expect parent stack passing state to transition back to === -1 (pending/unknown)
        //         store.commit('addCard', {
        //             stackId: id,
        //             content: 'test'
        //         });
        //         const secondCardId = stack.card_order[stack.card_order.length - 1];
        //         if (stack.passing !== -1) {
        //             throw new Error("expected passing to be -1 when pending child added")
        //         }
        //         // set second child as failing => expect parent stack passing status to === false
        //         store.commit('setCardPassingStatus', { card: stack.cards[secondCardId], passing: false });
        //         if (stack.passing !== false) {
        //             throw new Error("expected passing to be false when child card set to failing")
        //         }
        //         // set second child as passing => expect parent stack passing status to === true
        //         store.commit('setCardPassingStatus', { card: stack.cards[secondCardId], passing: true });
        //         if (stack.passing !== true) {
        //             throw new Error("expected passing to be true when all child cards are passing, got " + stack.passing)
        //         }

        //         // TODO: test the same but with recursive subStacks and subStack cards
        //         // to make sure status bubbling works as expected

        //         // clean up / delete the test stack
        //         store.dispatch('deleteStackSilent', id);
        //         // return true if we made it this far so the test is flagged as passing
        //         return true;

        //     }
        // },
        // // {
        // //     name: 'stacks can be resized to show multiple columns of cards',
        // //     test(i) {
        // //         // test that changing stackColumns changes the number of columns
        // //         // test that changing cardColumns changes the number of columns
        // //     }
        // // },
        // {
        //     name: 'cards can be focused',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const stack = store.state.stacks[stackId];
        //         store.commit('addCard', { stackId, content: 'test' });
        //         const cardId = stack.card_order[stack.card_order.length - 1];
        //         const card = stack.cards[cardId];
        //         const before = card.focused;
        //         store.commit('setCardFocused', { card, focused: true });
        //         const after = card.focused;
        //         store.dispatch('deleteStackSilent', stackId);
        //         return before !== after;
        //     }
        // },
        // {
        //     name: 'stacks can be nested',
        //     test(i) {
        //         // add a stack for this test
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 // tag for cleanup
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         // get the id of the newly added stack
        //         const parentStackId = store.state.stack_order[store.state.stack_order.length - 1]

        //         // add a child card to the parent stack
        //         store.commit('addCard', {
        //             stackId: parentStackId,
        //             content: 'test parent card'
        //         });

        //         // generate a child stack
        //         store.commit('addStack', {
        //             name: 'test substack',
        //             parentStackId: parentStackId,
        //             // tag for cleanup
        //             tags: [TAG_TEST_STACK]
        //         });
        //         const childStackId = store.state.stack_order[store.state.stack_order.length - 1]

        //         // add a child card to the childStack
        //         store.commit('addCard', {
        //             stackId: childStackId,
        //             content: 'test substack card'
        //         });

        //         // attempt to add childstack to parent stack
        //         store.commit('addSubstackAsCard', {
        //             parentStackId,
        //             childStackId
        //         });

        //         // verify the parent stack exists
        //         const parentStack = store.state.stacks[parentStackId];
        //         if (!parentStack) {
        //             throw new Error("parent stack does not exist")
        //         }
        //         // verify the parent stack 1st child card exists
        //         const parentStackFirstChildCard = parentStack.cards[parentStack.card_order[0]];
        //         if (!parentStackFirstChildCard) {
        //             throw new Error("parent stack first child card does not exist")
        //         }
        //         // verify the parent stack 2nd child is a substack
        //         const parentStackSecondChildCard = parentStack.cards[parentStack.card_order[1]];
        //         if (!parentStackSecondChildCard) {
        //             throw new Error("parent stack second child card does not exist")
        //         }
        //         // verify the substack has a card
        //         const childStackAsCard = parentStack.cards[parentStack.card_order[1]];
        //         const childStackAsStack = store.state.stacks[childStackAsCard.referenceStackId.toString()];
        //         if (
        //             !childStackAsStack
        //             || childStackAsStack?.card_order?.length !== 1
        //             || Object.keys(childStackAsStack.cards).length !== 1
        //         ) {
        //             throw new Error("child stack || child stack > child card does not exist")
        //         }

        //         return true;

        //     }
        // },
        // // prevent deleting system stacks
        // {
        //     name: 'stacks can be locked / read-only',
        //     test: (i) => -1
        // },
        // // prevent deleting system cards
        // {
        //     name: 'cards can be locked / read-only',
        //     test: (i) => -1
        // },
        // {
        //     name: 'cards can be completed',
        //     test: (i) => -1
        // },
        // {
        //     name: 'cards can have tags',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const stack = store.state.stacks[stackId];
        //         store.commit('addCard', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_CARD
        //             ]
        //         })
        //         const cardId = stack.card_order[stack.card_order.length - 1];
        //         const card = stack.cards[cardId];

        //         const before = card.tags.length;
        //         store.commit('cardAddTags', {
        //             cardId, tags: [
        //                 TAG_HIDE_COMPLETE_TOGGLE
        //             ]
        //         });
        //         const after = card.tags.length;

        //         if (before === after || after !== 2) {
        //             throw new Error("error testing adding tags to card")
        //         }
        //         // test deleting tags
        //         store.dispatch('cardDeleteTags', {
        //             cardId, tags: [
        //                 TAG_TEST_CARD,
        //                 TAG_HIDE_COMPLETE_TOGGLE
        //             ]
        //         })
        //         const afterDeleteLen = card.tags.length;
        //         if (afterDeleteLen !== 0) {
        //             throw new Error("error testing deleting tags from card")
        //         }
        //         // Cleanup
        //         store.dispatch('deleteStackSilent', stackId);
        //     }
        // },
        // {
        //     name: 'stacks can have tags',
        //     test(i) {
        //         store.commit('addStack', {
        //             name: i.name,
        //             tags: [
        //                 TAG_TEST_STACK
        //             ]
        //         });
        //         let stackId = store.state.stack_order[store.state.stack_order.length - 1]
        //         const stack = store.state.stacks[stackId];
        //         const before = stack.tags.length;
        //         store.commit('stackAddTags', {
        //             stackId, tags: [
        //                 TAG_HIDE_COMPLETE_TOGGLE
        //             ]
        //         });
        //         const after = stack.tags.length;
        //         store.dispatch('deleteStackSilent', stackId);
        //         return before !== after && after === 2;
        //     }
        // },
        // {
        //     name: 'users can define custom tags',
        //     test: (i) => -1
        // },
        // {
        //     name: 'users can define custom tag colors',
        //     test: (i) => -1
        // },
        // {
        //     name: 'users are shown recommended tags when adding a tag',
        //     test: (i) => -1
        // },
        // {
        //     name: 'the user can re-open closed stacks',
        //     test(i) {
        //         return -1;
        //     }
        // },
        /* {
            given: 'guest user adds a stack named <$name>',
            when: 'a stack named <$name> is added',
            then: 'the user sees the Add Card input for the new stack'
        },
        {
            given: 'guest user adds a card to a stack',
            when: 'a card is added to a stack',
            then: 'the card is added to the stack'
        },
        {
            given: 'guest user drags a card between stacks',
            when: 'the card is dropped',
            then: 'the card is moved to the new stack'
        } */
        // {
        //     name: 'failing test stacks and cards are cleaned up',
        //     test(i) {
        //         // delete any stacks tagged with TAG_TEST_STACK
        //         const testStacks = Object.values(store.state.stacks).filter(s => s.tags.includes(TAG_TEST_STACK));
        //         testStacks.forEach(s => store.dispatch('deleteStackSilent', s.id));
        //         // verify none match TAG_TEST_STACK
        //         const testStacksAfter = Object.values(store.state.stacks).filter(s => s.tags.includes(TAG_TEST_STACK));
        //         return testStacksAfter.length === 0;
        //     }
        // },

        // Add more feature tests here

        // ... {name, test(i)},

        // {
        //     name: 'the system can toggle between themes',
        //     test(i) {
        //         const before = store.state.theme;
        //         store.commit('setTheme', store.state.AVAILABLE_THEMES[1]);
        //         const after = store.state.theme;
        //         return before !== after;
        //     }
        // },


        // Keep this last
        // {
        //     name: 'The system boots without error',
        //     required: true,
        //     test(i) {
        //         // check system stack for any cards where error is not null
        //         const at_least_one_error_in_system_stack = Object.values(store.state.stacks[SYSTEM_STACK_ID].cards).find(c => c.error !== null);
        //         return !at_least_one_error_in_system_stack;
        //     }
        // },
    ];

    // clean up an "TEST_TAG" tagged fields
    store.dispatch('actionDeleteFieldsByTag', C.TAGS.TEST_TAG)

    const featureTestNames = featureTests.map(f => f.name);

    window.featureTests = featureTests;
    window.featureTestNames = featureTestNames;
    window.systemStack = systemStack;

    // todo: safe mode
    // todo: parallel sandboxes


    // todo: boot prefs
    const skipSelfTest = false;
    if (!skipSelfTest) {
        runFeatureTests();
    }

    // --- //
    // Begin our main execution loop
    // let interrupt = false;
    // while(!interrupt){
    // }
    const mainLoop = () => {
        // starting with the root field, pulse the executor
        // it will walk over all subfields recursively, pulsing any that are executable
        // and then it will pulse any fields that are observing the return values of those fields
        const rootField = store.state.fields[FEATURE_TEST_ROOT_FIELD_ID];
        const rootSandbox = store.state.sandboxes[rootField.sandboxID];
        const rootExecutor = rootSandbox.executor;
        rootExecutor.pulse();

        requestAnimationFrame(mainLoop);
    }
    requestAnimationFrame(mainLoop);
}

/**
 * refactor note:
 * refactoring this from using Stacks/Cards to represent the system
 * to using Fields of Fields
 */
function runFeatureTests() {
    // Loop through the feature tests array
    featureTests.forEach(async (featureTest) => {
        const existingFeatureField = Object.values(store.state.fields).find((f) => f.name === featureTest.name);
        let featureField;
        // If the feature field doesn't exist, add it to the system stack
        // if (!existingFeatureField) {
        let featureFieldID = await store.dispatch('addField', {
            //id: featureTest.name, // override the auto-assigned id
            name: featureTest.name,
            parentFieldID: FEATURE_TEST_ROOT_FIELD_ID,
            tags: [
                // Fields tagged with test fields have a "passing" property
                C.TAGS.FEATURE_TEST_FIELD
            ],
        });
        // console.warn('RunFeatureTests: FeatureFieldID:', featureFieldID)
        featureField = store.state.fields[featureFieldID];
        // }
        featureField = featureField ?? existingFeatureField;
        if (!featureField) {
            throw new Error('could not find or create FeatureField named: ' + featureTest.name);
        }
        //console.warn('testing feature field: ', {featureField})
        // clear any lingering errors (todo: make this an array of errors)
        featureField.error = null;

        let passing;
        try {

            passing = await featureTest.test(featureTest);
        } catch (e) {
            if (!featureTest.required) {
                // continue
                console.error('UN-Required (Optional) FeatureTest Failed:\n "' + featureTest.name + '"');
                console.error(e);
                // attach error for output
                // card.error = e;
                store.commit('setFieldError', { fieldID: featureField.id, error: e })
            } else {
                console.error('=== REQUIRED feature test failed "' + featureTest.name + '"');
                // rethrow
                console.error('THE ERROR:', e);
                throw e;
            }
        }

        // if passing === -1, it's pending
        store.commit('setFieldPassingStatus', { fieldID: featureField.id, passing })

    });
}

// loop through the system stack and make sure no disabled features remain

(() => {
    // expose these things on the window when the js file is loaded
    window.bootSystem = bootSystem;
    window.runFeatureTests = runFeatureTests;
})()